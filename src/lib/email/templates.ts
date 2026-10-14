import type { LeadPayload } from "../validation";

/** Everything in an email that came from the visitor goes through this first. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type BookedMeeting = {
  /** e.g. "Tuesday, October 14, 2026 at 3:00 PM EDT" */
  when: string;
  /** e.g. "Tue, Oct 14, 3:00 PM EDT" (used in the subject) */
  whenShort: string;
  durationMin: number;
  url: string;
  /** "Add to Google Calendar" link (the email has no attachment) */
  calendarUrl: string;
};

export type Rendered = { subject: string; text: string; html: string };

// same palette as the website (see globals.css)
const C = {
  paper: "#f6efe6",
  card: "#ffffff",
  panel: "#f8f2e9",
  ink: "#2a211b",
  muted: "#675a4f",
  line: "#e6d9c8",
  blue: "#2f66d4",
  blueSoft: "#e8eefb",
  cta: "#b4531f",
};

const FONT = "Arial,Helvetica,sans-serif";
const TAGLINE = "Built by iSN. Built for Mystery Shopping.";

function layout(opts: { preheader: string; heading: string; badge: string; body: string; reason: string }): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light only;}</style><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
      <tr><td style="padding:0 4px 18px;font-family:${FONT};font-size:18px;font-weight:700;color:${C.ink};">
        <span style="color:${C.blue};font-style:italic;letter-spacing:-0.5px;">iSN</span>
        <span style="color:${C.line};padding:0 8px;">|</span>MS Dashboard
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:32px 30px;font-family:${FONT};color:${C.ink};">
        <div style="margin:0 0 14px;"><span style="display:inline-block;background:${C.blueSoft};color:${C.blue};border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:.04em;">${escapeHtml(opts.badge)}</span></div>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:${C.ink};">${escapeHtml(opts.heading)}</h1>
        ${opts.body}
      </td></tr>
      <tr><td style="padding:18px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
        ${escapeHtml(opts.reason)}<br>
        <span style="color:${C.blue};font-style:italic;font-weight:700;">iSN</span> &nbsp;|&nbsp; ${escapeHtml(TAGLINE)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const p = (html: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.muted};">${html}</p>`;

const label = (text: string) =>
  `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">${text}</div>`;

function detailsBlock(lead: LeadPayload): string {
  const row = (name: string, value: string) =>
    `<tr><td style="padding:4px 14px 4px 0;font-size:13px;color:${C.muted};">${name}</td><td style="padding:4px 0;font-size:13px;color:${C.ink};">${escapeHtml(value)}</td></tr>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 4px;border-top:1px solid ${C.line};padding-top:10px;width:100%;">
    ${row("Name", lead.name)}${row("Company", lead.company)}${row("Phone", lead.phone)}${row("Email", lead.email)}
  </table>`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

const REASON = "You're getting this one-time email because you contacted us through the MS Dashboard website. Reply to this email and a person on the iSN team will answer.";

/** The email the visitor gets: a meeting confirmation with the link, or a plain confirmation. */
export function buildConfirmationEmail(lead: LeadPayload, meeting?: BookedMeeting): Rendered {
  const hi = escapeHtml(firstName(lead.name));

  if (meeting) {
    const subject = `Confirmed: your MS Dashboard call on ${meeting.whenShort}`;
    const html = layout({
      preheader: `Your call with the iSN team is set for ${meeting.whenShort}. The meeting link is inside.`,
      badge: "Meeting confirmed",
      heading: "Your meeting is confirmed",
      reason: REASON,
      body: [
        p(`Hi ${hi}, your call with the iSN team is confirmed. We'll show you how MS Dashboard can simplify the way you manage and report your Mystery Shopping data, and answer your questions.`),
        `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:6px 0 18px;background:${C.panel};border-radius:14px;">
          <tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${C.ink};">
            ${label("When")}
            <div style="font-size:16px;font-weight:700;margin-bottom:10px;">${escapeHtml(meeting.when)}</div>
            ${label("Duration")}
            <div style="font-weight:700;margin-bottom:10px;">${meeting.durationMin} minutes</div>
            ${label("Where")}
            <div style="font-weight:700;">Online video call</div>
          </td></tr>
        </table>`,
        `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px;"><tr><td style="background:${C.cta};border-radius:999px;">
          <a href="${escapeHtml(meeting.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Join the meeting</a>
        </td></tr></table>`,
        p(`The button not working? Copy this link into your browser:<br><a href="${escapeHtml(meeting.url)}" style="color:${C.blue};word-break:break-all;">${escapeHtml(meeting.url)}</a>`),
        p(`<a href="${escapeHtml(meeting.calendarUrl)}" style="color:${C.blue};font-weight:700;">Add to Google Calendar</a><br>Need a different time? Just reply to this email.`),
        `<div style="margin-top:8px;">${label("Details you shared")}</div>`,
        detailsBlock(lead),
      ].join(""),
    });
    const text = [
      `Hi ${firstName(lead.name)},`,
      "",
      "Your call with the iSN team is confirmed. We'll show you how MS Dashboard can simplify the way you manage and report your Mystery Shopping data, and answer your questions.",
      "",
      `When: ${meeting.when}`,
      `Duration: ${meeting.durationMin} minutes`,
      "Where: Online video call",
      `Meeting link: ${meeting.url}`,
      "",
      `Add to Google Calendar: ${meeting.calendarUrl}`,
      "Need a different time? Just reply to this email.",
      "",
      "Details you shared:",
      `Name: ${lead.name}`,
      `Company: ${lead.company}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email}`,
      "",
      "--",
      REASON,
      `iSN | ${TAGLINE}`,
    ].join("\n");
    return { subject, text, html };
  }

  const subject = `Thanks, ${firstName(lead.name)}. We've received your MS Dashboard request`;
  const html = layout({
    preheader: "We have your details. Someone from the iSN team will be in touch shortly.",
    badge: "Request received",
    heading: "We've received your details",
    reason: REASON,
    body: [
      p(
        `Hi ${hi}, thanks for getting in touch about MS Dashboard. Someone from the iSN team will contact you shortly to talk about how it can simplify the way you manage and report your Mystery Shopping data.`,
      ),
      p("Would you rather talk sooner? Just reply to this email."),
      `<div style="margin-top:8px;">${label("Details you shared")}</div>`,
      detailsBlock(lead),
    ].join(""),
  });
  const text = [
    `Hi ${firstName(lead.name)},`,
    "",
    "Thanks for getting in touch about MS Dashboard. Someone from the iSN team will contact you shortly to talk about how it can simplify the way you manage and report your Mystery Shopping data.",
    "",
    "Would you rather talk sooner? Just reply to this email.",
    "",
    "Details you shared:",
    `Name: ${lead.name}`,
    `Company: ${lead.company}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    "",
    "--",
    REASON,
    `iSN | ${TAGLINE}`,
  ].join("\n");
  return { subject, text, html };
}

const REMINDER_REASON =
  "You're getting this one-time reminder because you booked a call through the MS Dashboard website. Reply to this email if you need to change the time.";

/** The reminder sent the day before a booked call ("today" if it is sent late, on the day itself). */
export function buildReminderEmail(visitor: { name: string }, meeting: BookedMeeting, day: "tomorrow" | "today"): Rendered {
  const hi = escapeHtml(firstName(visitor.name));
  const subject = `Reminder: your MS Dashboard call is ${day}, ${meeting.whenShort}`;
  const intro = `Hi ${firstName(visitor.name)}, a quick reminder that you have a call with the iSN team ${day}.`;

  const html = layout({
    preheader: `Your call with the iSN team is ${day}, ${meeting.whenShort}. The meeting link is inside.`,
    badge: "Reminder",
    heading: `Your call is ${day}`,
    reason: REMINDER_REASON,
    body: [
      p(`Hi ${hi}, a quick reminder that you have a call with the iSN team ${day}.`),
      `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:6px 0 18px;background:${C.panel};border-radius:14px;">
        <tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${C.ink};">
          ${label("When")}
          <div style="font-size:16px;font-weight:700;margin-bottom:10px;">${escapeHtml(meeting.when)}</div>
          ${label("Duration")}
          <div style="font-weight:700;margin-bottom:10px;">${meeting.durationMin} minutes</div>
          ${label("Where")}
          <div style="font-weight:700;">Online video call</div>
        </td></tr>
      </table>`,
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px;"><tr><td style="background:${C.cta};border-radius:999px;">
        <a href="${escapeHtml(meeting.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Join the meeting</a>
      </td></tr></table>`,
      p(`The button not working? Copy this link into your browser:<br><a href="${escapeHtml(meeting.url)}" style="color:${C.blue};word-break:break-all;">${escapeHtml(meeting.url)}</a>`),
      p(`<a href="${escapeHtml(meeting.calendarUrl)}" style="color:${C.blue};font-weight:700;">Add to Google Calendar</a><br>Need a different time? Just reply to this email.`),
    ].join(""),
  });

  const text = [
    intro,
    "",
    `When: ${meeting.when}`,
    `Duration: ${meeting.durationMin} minutes`,
    "Where: Online video call",
    `Meeting link: ${meeting.url}`,
    "",
    `Add to Google Calendar: ${meeting.calendarUrl}`,
    "Need a different time? Just reply to this email.",
    "",
    "--",
    REMINDER_REASON,
    `iSN | ${TAGLINE}`,
  ].join("\n");
  return { subject, text, html };
}

/** Optional heads-up for the iSN team (only sent when LEAD_NOTIFICATION_TO is configured). */
export function buildTeamNotification(lead: LeadPayload, meeting?: BookedMeeting): { subject: string; text: string } {
  const subject = meeting
    ? `New MS Dashboard lead (call booked): ${lead.company}`
    : `New MS Dashboard lead: ${lead.company}`;
  const text = [
    meeting ? "A visitor booked a call." : "A visitor asked to be emailed (no call booked).",
    "",
    `Name: ${lead.name}`,
    `Company: ${lead.company}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    ...(meeting ? ["", `When: ${meeting.when}`, `Duration: ${meeting.durationMin} minutes`, `Meeting link: ${meeting.url}`] : []),
  ].join("\n");
  return { subject, text };
}
