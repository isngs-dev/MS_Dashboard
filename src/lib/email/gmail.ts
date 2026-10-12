/**
 * Sends the confirmation emails through the Gmail API (plain fetch + hand-built MIME, no SDK).
 * Server-only. It reuses the Google credentials of the calendar (see lib/google/calendar.ts):
 * the account that signed in with `npm run google:auth` is the sender, so the mail goes out from
 * that mailbox, signed by Google (SPF/DKIM of your own domain) and shows up in its Sent folder.
 *
 * The OAuth token needs the `gmail.send` scope: run `npm run google:auth` again after upgrading.
 */
import { randomUUID } from "node:crypto";
import { forgetGoogleTokens, GMAIL_API_BASE, googleAccessToken, googleConfig, type GoogleConfig } from "@/lib/google/calendar";

export type EmailConfig = {
  /** the Google credentials mail is sent with; null = not configured */
  google: GoogleConfig | null;
  /** the From address: the signed-in account, or one of its "Send mail as" aliases */
  fromEmail: string | undefined;
  fromName: string;
  replyTo: string | undefined;
  notifyTo: string | undefined;
  /** copied (Cc) on the visitor's confirmation email, from MAIL_CC (comma separated) */
  cc: string[];
};

// conservative on purpose: nothing that could break out of a header
const SAFE_ADDRESS_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function emailConfig(): EmailConfig {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  return {
    google: googleConfig(),
    fromEmail: clean(process.env.MAIL_FROM_EMAIL) ?? clean(process.env.GOOGLE_IMPERSONATE_USER),
    fromName: clean(process.env.MAIL_FROM_NAME) ?? "MS Dashboard",
    replyTo: clean(process.env.MAIL_REPLY_TO),
    notifyTo: clean(process.env.LEAD_NOTIFICATION_TO),
    cc: (process.env.MAIL_CC ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter((e) => SAFE_ADDRESS_RE.test(e)),
  };
}

export const isEmailConfigured = (c: EmailConfig) => Boolean(c.google && c.fromEmail);

/** Plain mail only: no attachments are ever sent (they make a message look more like spam). */
export type MailInput = {
  to: { email: string; name?: string };
  /** visible to the recipient; addresses equal to `to` (or repeated) are dropped */
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
};

/* ------------------------------------------------------------------------ */
/* MIME                                                                      */
/* ------------------------------------------------------------------------ */

/** Header values never contain line breaks or control characters (that is how header injection works). */
const oneLine = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

const isAscii = (value: string) => /^[\x20-\x7e]*$/.test(value);

/** RFC 2047: non-ASCII header text as UTF-8 base64 "encoded words", split so no word is too long. */
function encodeHeaderText(value: string): string {
  if (isAscii(value)) return value;
  const words: string[] = [];
  let chunk = "";
  for (const character of value) {
    if (Buffer.byteLength(chunk + character) > 42) {
      words.push(chunk);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w).toString("base64")}?=`).join("\r\n ");
}

function formatAddress(email: string, name?: string): string {
  if (!SAFE_ADDRESS_RE.test(email)) throw new Error("Refusing to send to an unsafe email address");
  const display = name ? oneLine(name) : "";
  if (!display) return email;
  return isAscii(display) ? `"${display.replace(/(["\\])/g, "\\$1")}" <${email}>` : `${encodeHeaderText(display)} <${email}>`;
}

const base64Lines = (value: string) => (Buffer.from(value, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");

function buildMessage(config: EmailConfig, mail: MailInput): string {
  const fromEmail = config.fromEmail as string;
  const seen = new Set([mail.to.email.toLowerCase()]);
  const cc = (mail.cc ?? []).filter((address) => {
    const key = address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const headers = [
    `From: ${formatAddress(fromEmail, config.fromName)}`,
    `To: ${formatAddress(mail.to.email, mail.to.name)}`,
    ...(cc.length > 0 ? [`Cc: ${cc.map((address) => formatAddress(address)).join(", ")}`] : []),
    `Reply-To: ${formatAddress(config.replyTo ?? fromEmail)}`,
    `Subject: ${encodeHeaderText(oneLine(mail.subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${fromEmail.split("@")[1]}>`,
    "MIME-Version: 1.0",
  ];

  const part = (type: string, body: string) =>
    [`Content-Type: ${type}; charset="UTF-8"`, "Content-Transfer-Encoding: base64", "", base64Lines(body)].join("\r\n");

  if (!mail.html) return [...headers, ...part("text/plain", mail.text).split("\r\n")].join("\r\n");

  const boundary = `=_ms_${randomUUID().replace(/-/g, "")}`;
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    part("text/plain", mail.text),
    `--${boundary}`,
    part("text/html", mail.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

/* ------------------------------------------------------------------------ */

export async function sendMail(config: EmailConfig, mail: MailInput): Promise<void> {
  if (!config.google || !config.fromEmail) throw new Error("Gmail sending is not configured");

  const raw = Buffer.from(buildMessage(config, mail), "utf8").toString("base64url");
  const token = await googleAccessToken(config.google, "gmail");

  const response = await fetch(`${GMAIL_API_BASE}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    if (response.status === 401) forgetGoogleTokens();
    // Google's error text (insufficient scopes, API not enabled, ...) tells you what to fix and holds no visitor data.
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Gmail API ${response.status}: ${(data.error?.message ?? "request failed").slice(0, 300)}`);
  }
}
