import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { allow } from "@/lib/rateLimit";
import { formatMeeting, zonedTimeToUtc } from "@/lib/time";
import {
  normalizeLead,
  validateLead,
  validateMeeting,
  type LeadPayload,
  type MeetingRequest,
} from "@/lib/validation";
import { buildIcs } from "@/lib/email/ics";
import { emailConfig, isEmailConfigured, sendMail, type Attachment } from "@/lib/email/sendgrid";
import { buildConfirmationEmail, buildTeamNotification, type BookedMeeting } from "@/lib/email/templates";
import { bookMeeting, cancelMeeting, CalendarError, googleConfig, type GoogleConfig } from "@/lib/google/calendar";

export const runtime = "nodejs";

const MAX_BODY_CHARS = 8_000;
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Lead endpoint behind the "Build My Dashboard" form + "Schedule a Meet" pop-up.
 *
 *  - validates the lead (and the meeting, if one was booked)
 *  - booked a call:
 *      Google Calendar configured -> checks the slot is free, creates the event with a
 *                                    Google Meet link and invites the visitor
 *      otherwise                  -> a private Jitsi room (or MEETING_URL) + a .ics invite
 *    then sends the confirmation email (with the meeting link) through SendGrid
 *  - "just email me": sends the normal confirmation email
 *  - optionally tells the iSN team (set LEAD_NOTIFICATION_TO)
 *
 * Configuration lives in environment variables, see .env.example.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return json({ ok: false, error: "too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot: real visitors never see or fill this field. Pretend success, send nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, delivered: false });
  }

  if (!allow(`ip:${clientIp(request)}`, 12, 10 * 60_000)) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const lead: LeadPayload = normalizeLead({
    name: str(body.name),
    company: str(body.company),
    phone: str(body.phone),
    email: str(body.email),
  });

  const leadErrors = validateLead(lead);
  if (Object.keys(leadErrors).length > 0) return json({ ok: false, errors: leadErrors }, 422);

  let meeting: MeetingRequest | undefined;
  let start: Date | undefined;
  if (body.meeting !== undefined && body.meeting !== null) {
    const m = (typeof body.meeting === "object" ? body.meeting : {}) as Record<string, unknown>;
    meeting = { date: str(m.date).trim(), time: str(m.time).trim(), timeZone: str(m.timeZone).trim() };
    const meetingErrors = validateMeeting(meeting);
    if (Object.keys(meetingErrors).length > 0) return json({ ok: false, errors: { meeting: meetingErrors } }, 422);
    start = zonedTimeToUtc(meeting.date, meeting.time, meeting.timeZone) ?? undefined;
    if (!start) return json({ ok: false, errors: { meeting: { date: "Please choose a valid date and time." } } }, 422);
  }

  // Stop one address from being mailed over and over from many IPs.
  if (!allow(`email:${lead.email}`, 4, 60 * 60_000)) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const config = emailConfig();
  const emailReady = isEmailConfigured(config);

  // Fail before touching the calendar: an event nobody is told about would be worse than an error.
  if (!emailReady && IS_PROD) {
    console.error("[lead] SENDGRID_API_KEY / SENDGRID_FROM_EMAIL are not set; cannot send the confirmation email.");
    return json({ ok: false, error: "email_not_configured" }, 503);
  }

  // ---- book the meeting ----------------------------------------------------
  const google = googleConfig();
  const durationMin = meetingDuration();
  let booked: BookedMeeting | undefined;
  let attachments: Attachment[] | undefined;
  let calendarEventId: string | undefined;

  if (meeting && start) {
    const when = formatMeeting(start, meeting.timeZone);

    if (google) {
      try {
        const booking = await bookMeeting(google, {
          start,
          durationMin,
          timeZone: meeting.timeZone,
          summary: `MS Dashboard call: ${plain(lead.name)} (${plain(lead.company)})`,
          description: [
            "Booked on the MS Dashboard website.",
            "",
            `Name: ${plain(lead.name)}`,
            `Company: ${plain(lead.company)}`,
            `Phone: ${plain(lead.phone)}`,
            `Email: ${plain(lead.email)}`,
          ].join("\n"),
          attendee: { email: lead.email, name: lead.name },
        });
        calendarEventId = booking.eventId;
        booked = { when, durationMin, url: booking.meetUrl };
        // Google's own invitation already puts the event in the visitor's calendar: no .ics needed.
      } catch (error) {
        if (error instanceof CalendarError && error.kind === "busy") {
          return json({ ok: false, error: "slot_unavailable" }, 409);
        }
        console.error("[lead] Google Calendar booking failed:", error instanceof Error ? error.message : error);
        return json({ ok: false, error: "calendar_failed" }, 502);
      }
    } else {
      const url = meetingUrl();
      booked = { when, durationMin, url };
      const ics = buildIcs({
        uid: `${randomUUID()}@isngs.com`,
        start,
        durationMin,
        summary: "MS Dashboard call with iSN",
        description: `Your MS Dashboard call with the iSN team.\nJoin: ${url}`,
        url,
        organizer: { name: config.fromName, email: config.fromEmail ?? "no-reply@example.com" },
        attendee: { name: lead.name, email: lead.email },
      });
      attachments = [
        { content: Buffer.from(ics, "utf8").toString("base64"), filename: "ms-dashboard-meeting.ics", type: "text/calendar; method=REQUEST" },
      ];
    }
  }

  const confirmation = buildConfirmationEmail(lead, booked);

  // ---- deliver -------------------------------------------------------------
  if (!emailReady) {
    // Local development without a SendGrid key: write the email to disk so it can be inspected.
    await writeDevOutbox(confirmation, attachments);
    console.warn("[lead] SendGrid is not configured. Dev only: wrote the email to .dev-outbox/ instead of sending it.");
    return json({ ok: true, delivered: false, booked: Boolean(booked) });
  }

  try {
    await sendMail(config, { to: { email: lead.email, name: lead.name }, ...confirmation, attachments });
  } catch (error) {
    // The error text comes from SendGrid and never contains the visitor's details.
    console.error("[lead] confirmation email failed:", error instanceof Error ? error.message : error);
    await undoBooking(google, calendarEventId);
    return json({ ok: false, error: "email_failed" }, 502);
  }

  if (config.notifyTo) {
    try {
      const note = buildTeamNotification(lead, booked);
      await sendMail(config, { to: { email: config.notifyTo }, subject: note.subject, text: note.text });
    } catch (error) {
      // The visitor already got their confirmation, so a failed team copy must not fail the request.
      console.error("[lead] team notification failed:", error instanceof Error ? error.message : error);
    }
  }

  return json({ ok: true, delivered: true, booked: Boolean(booked) });
}

/* ------------------------------------------------------------------------ */

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
}

/** Visitor text going into a calendar event: Google renders HTML in descriptions, so strip tags and line breaks. */
function plain(value: string): string {
  return value.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

/** If the confirmation email failed after the event was created, take the event off the calendar again. */
async function undoBooking(google: GoogleConfig | null, eventId: string | undefined) {
  if (!google || !eventId) return;
  try {
    await cancelMeeting(google, eventId);
  } catch (error) {
    console.error("[lead] could not cancel the calendar event after an email failure:", error instanceof Error ? error.message : error);
  }
}

function meetingDuration(): number {
  const n = Number(process.env.MEETING_DURATION_MIN);
  return Number.isFinite(n) && n >= 15 && n <= 120 ? Math.round(n) : 30;
}

/**
 * Fallback link (used only when Google Calendar is not configured). Set MEETING_URL to your
 * own room (Teams, Zoom, ...) and everyone gets that link; otherwise each booking gets its own
 * private Jitsi Meet room, which needs no account to create.
 */
function meetingUrl(): string {
  const fixed = process.env.MEETING_URL?.trim();
  if (fixed && /^https:\/\//i.test(fixed)) return fixed;
  return `https://meet.jit.si/iSN-MSDashboard-${randomBytes(6).toString("hex")}`;
}

async function writeDevOutbox(email: { subject: string; text: string; html: string }, attachments?: Attachment[]) {
  const dir = path.join(process.cwd(), ".dev-outbox");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "latest-email.html"), email.html, "utf8");
  await writeFile(path.join(dir, "latest-email.txt"), `Subject: ${email.subject}\n\n${email.text}\n`, "utf8");
  // drop the invite from a previous booking so the outbox always matches the latest email
  await rm(path.join(dir, "ms-dashboard-meeting.ics"), { force: true });
  for (const a of attachments ?? []) {
    await writeFile(path.join(dir, a.filename), Buffer.from(a.content, "base64"));
  }
}
