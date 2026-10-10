/**
 * Google Calendar client: books a slot as a calendar event with a Google Meet link.
 *
 * Server-only, no SDK: plain fetch + Node's crypto. Two ways to authenticate
 * (whichever environment variables are present are used):
 *
 *  A) OAuth refresh token of the Google account whose calendar receives the bookings.
 *     Get it once with `npm run google:auth`.
 *  B) Service account with domain-wide delegation (Google Workspace), impersonating
 *     one Workspace user.
 *
 * What a booking does:
 *   1. free/busy check on the calendar, so the same slot is never booked twice
 *   2. creates the event with a Meet link and the visitor as an attendee
 *   (if sending the confirmation email then fails, the event is cancelled again)
 */
import { createSign, randomUUID } from "node:crypto";

const IS_PROD = process.env.NODE_ENV === "production";
// The two overrides exist so the flow can be tested against a local mock; they are ignored in production.
const API_BASE = (!IS_PROD && process.env.GOOGLE_API_BASE) || "https://www.googleapis.com";
const TOKEN_URL = (!IS_PROD && process.env.GOOGLE_TOKEN_URL) || "https://oauth2.googleapis.com/token";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

type Auth =
  | { kind: "oauth"; clientId: string; clientSecret: string; refreshToken: string }
  | { kind: "service-account"; email: string; privateKey: string; subject: string };

export type GoogleConfig = {
  auth: Auth;
  calendarId: string;
  /** who Google emails about the event: "all" = the visitor gets Google's own invitation too */
  sendUpdates: "all" | "externalOnly" | "none";
  /** extra people added to every booking (e.g. the sales team), so it shows in their calendars */
  extraAttendees: string[];
};

export class CalendarError extends Error {
  constructor(
    message: string,
    /** busy: slot taken; auth: credentials rejected; api: any other Google error */
    readonly kind: "busy" | "auth" | "api",
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

/** Reads the environment. Returns null when Google Calendar is not configured. */
export function googleConfig(): GoogleConfig | null {
  const v = (key: string) => process.env[key]?.trim() || undefined;

  let auth: Auth | null = null;
  const clientId = v("GOOGLE_CLIENT_ID");
  const clientSecret = v("GOOGLE_CLIENT_SECRET");
  const refreshToken = v("GOOGLE_REFRESH_TOKEN");
  const saEmail = v("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const saKey = v("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  const subject = v("GOOGLE_IMPERSONATE_USER");

  if (clientId && clientSecret && refreshToken) {
    auth = { kind: "oauth", clientId, clientSecret, refreshToken };
  } else if (saEmail && saKey && subject) {
    // keys pasted into .env files usually carry the line breaks as literal "\n"
    auth = { kind: "service-account", email: saEmail, privateKey: saKey.replace(/\\n/g, "\n"), subject };
  }
  if (!auth) return null;

  const updates = v("GOOGLE_SEND_UPDATES");
  return {
    auth,
    calendarId: v("GOOGLE_CALENDAR_ID") ?? "primary",
    sendUpdates: updates === "none" || updates === "externalOnly" ? updates : "all",
    extraAttendees: (v("GOOGLE_EXTRA_ATTENDEES") ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)),
  };
}

/* ------------------------------------------------------------------------ */
/* Authentication                                                            */
/* ------------------------------------------------------------------------ */

let cached: { token: string; expiresAt: number } | null = null;

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function signServiceAccountJwt(auth: Extract<Auth, { kind: "service-account" }>): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: auth.email, sub: auth.subject, scope: SCOPES.join(" "), aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(auth.privateKey);
  return `${header}.${claims}.${b64url(signature)}`;
}

async function accessToken(cfg: GoogleConfig): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const form = new URLSearchParams();
  if (cfg.auth.kind === "oauth") {
    form.set("grant_type", "refresh_token");
    form.set("client_id", cfg.auth.clientId);
    form.set("client_secret", cfg.auth.clientSecret);
    form.set("refresh_token", cfg.auth.refreshToken);
  } else {
    form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    form.set("assertion", signServiceAccountJwt(cfg.auth));
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    // Google's error codes (invalid_grant, ...) contain no secrets and tell you what to fix.
    const reason = [data.error, data.error_description].filter(Boolean).join(": ") || String(response.status);
    throw new CalendarError(`Google token request failed (${reason})`, "auth");
  }
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/* ------------------------------------------------------------------------ */
/* Calendar API                                                              */
/* ------------------------------------------------------------------------ */

async function calendarApi<T>(
  cfg: GoogleConfig,
  path: string,
  options: { method?: string; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const token = await accessToken(cfg);
  const url = new URL(`${API_BASE}/calendar/v3${path}`);
  for (const [k, val] of Object.entries(options.query ?? {})) url.searchParams.set(k, val);

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) {
    if (response.status === 401) cached = null; // token revoked or expired early
    const message = `Google Calendar API ${response.status}: ${data.error?.message ?? "request failed"}`;
    throw new CalendarError(message, response.status === 401 ? "auth" : "api");
  }
  return data as T;
}

type CalendarEvent = {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

const meetUrlOf = (event: CalendarEvent): string | undefined =>
  event.hangoutLink ?? event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;

export type BookingInput = {
  start: Date;
  durationMin: number;
  /** IANA zone the visitor picked, used for how the event time is displayed */
  timeZone: string;
  summary: string;
  description: string;
  attendee: { email: string; name: string };
};

export type Booking = { eventId: string; meetUrl: string; eventUrl?: string };

/** True when the calendar already has something in that window. */
async function isBusy(cfg: GoogleConfig, start: Date, end: Date): Promise<boolean> {
  const result = await calendarApi<{
    calendars?: Record<string, { busy?: unknown[]; errors?: { reason?: string }[] }>;
  }>(cfg, "/freeBusy", {
    method: "POST",
    body: { timeMin: start.toISOString(), timeMax: end.toISOString(), items: [{ id: cfg.calendarId }] },
  });

  // the response is keyed by the id we sent ("primary" or an address); there is exactly one entry
  const calendar = Object.values(result.calendars ?? {})[0];
  if (!calendar) throw new CalendarError("Google free/busy returned no calendar", "api");
  if (calendar.errors?.length) {
    throw new CalendarError(`Google free/busy error: ${calendar.errors[0]?.reason ?? "unknown"}`, "api");
  }
  return (calendar.busy?.length ?? 0) > 0;
}

/**
 * Checks the slot is free, then creates the event with a Google Meet link.
 * Throws CalendarError("busy") if the slot is taken.
 */
export async function bookMeeting(cfg: GoogleConfig, input: BookingInput): Promise<Booking> {
  const end = new Date(input.start.getTime() + input.durationMin * 60_000);

  if (await isBusy(cfg, input.start, end)) throw new CalendarError("That slot is already booked", "busy");

  const attendees = [
    { email: input.attendee.email, displayName: input.attendee.name },
    ...cfg.extraAttendees.map((email) => ({ email })),
  ];

  const calendarPath = `/calendars/${encodeURIComponent(cfg.calendarId)}/events`;
  const created = await calendarApi<CalendarEvent>(cfg, calendarPath, {
    method: "POST",
    // conferenceDataVersion=1 is what makes Google generate the Meet link
    query: { conferenceDataVersion: "1", sendUpdates: cfg.sendUpdates },
    body: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
      end: { dateTime: end.toISOString(), timeZone: input.timeZone },
      attendees,
      conferenceData: {
        createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }] },
      extendedProperties: { private: { source: "ms-dashboard-website" } },
    },
  });

  // Meet links are normally ready immediately; if Google is still creating it, look again briefly.
  let event = created;
  for (let attempt = 0; attempt < 4 && !meetUrlOf(event); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    event = await calendarApi<CalendarEvent>(cfg, `${calendarPath}/${encodeURIComponent(created.id)}`);
  }

  const meetUrl = meetUrlOf(event);
  if (!meetUrl) {
    await cancelMeeting(cfg, created.id).catch(() => undefined);
    throw new CalendarError("Google did not return a Meet link for the event", "api");
  }
  return { eventId: created.id, meetUrl, eventUrl: event.htmlLink };
}

/** Removes a booking again (used when the confirmation email could not be sent). */
export async function cancelMeeting(cfg: GoogleConfig, eventId: string): Promise<void> {
  await calendarApi<void>(cfg, `/calendars/${encodeURIComponent(cfg.calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    // tell the visitor too: they may already have received Google's invitation
    query: { sendUpdates: cfg.sendUpdates === "none" ? "none" : "all" },
  });
}
