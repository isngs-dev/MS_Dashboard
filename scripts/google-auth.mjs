/**
 * One-time helper: signs in to Google and saves a refresh token into .env.local,
 * so the website can create Google Calendar events (with Google Meet links) on that
 * account's calendar.
 *
 * Before running it you need GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (an OAuth client
 * of type "Desktop app") in .env.local. See "Google Calendar" in the README.
 *
 *   npm run google:auth
 */
import http from "node:http";
import { randomBytes } from "node:crypto";
import { exec } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];
const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;

function readEnvFile() {
  const values = {};
  if (!existsSync(envPath)) return values;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function saveEnvValue(key, value) {
  const text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(text) ? text.replace(pattern, line) : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
  writeFileSync(envPath, next, "utf8");
}

const env = { ...readEnvFile(), ...process.env };
const clientId = env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    [
      "",
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing from .env.local.",
      "",
      "1. Google Cloud Console > APIs & Services > enable \"Google Calendar API\"",
      "2. OAuth consent screen: choose \"Internal\" (Google Workspace) or publish the app (\"In production\")",
      "3. Credentials > Create credentials > OAuth client ID > Application type: Desktop app",
      "4. Put the client ID and secret in .env.local, then run this again.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: "code",
  scope: SCOPES.join(" "),
  access_type: "offline", // needed to receive a refresh token
  prompt: "consent", // makes Google return the refresh token every time
  state,
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT);
  if (url.pathname !== "/") {
    res.writeHead(404).end();
    return;
  }

  const finish = (status, title, message, exitCode) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>${title}</h1><p>${message}</p></body>`);
    setTimeout(() => process.exit(exitCode), 300);
  };

  if (url.searchParams.get("error")) {
    console.error(`Google returned an error: ${url.searchParams.get("error")}`);
    return finish(400, "Sign-in was cancelled", "You can close this tab and run the command again.", 1);
  }
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    return finish(400, "Invalid response", "The state did not match. Run the command again.", 1);
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code"),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.refresh_token) {
      console.error("Google did not return a refresh token:", tokens.error_description ?? tokens.error ?? response.status);
      return finish(500, "No refresh token", "Check the terminal for details, then try again.", 1);
    }

    saveEnvValue("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
    console.log(`\nDone. Saved GOOGLE_REFRESH_TOKEN (${tokens.refresh_token.slice(0, 6)}...) to .env.local`);
    console.log("Restart the website so it picks the new value up.\n");
    finish(200, "All set", "Google Calendar is connected. You can close this tab and go back to the terminal.", 0);
  } catch (error) {
    console.error("Token exchange failed:", error instanceof Error ? error.message : error);
    finish(500, "Something went wrong", "Check the terminal for details.", 1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this link, sign in with the Google account whose calendar should receive the bookings,");
  console.log("and approve access to Google Calendar:\n");
  console.log(authUrl.toString() + "\n");
  // best effort: open it automatically
  const opener = process.platform === "win32" ? `start "" "${authUrl}"` : process.platform === "darwin" ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener, () => undefined);
});

setTimeout(() => {
  console.error("Timed out waiting for Google (5 minutes).");
  process.exit(1);
}, 5 * 60_000).unref();
