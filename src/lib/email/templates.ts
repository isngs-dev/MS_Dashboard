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
  /** e.g. "Tuesday, October 14, 2026 at 3:00 PM GMT+1" */
  when: string;
  durationMin: number;
  url: string;
};

export type Rendered = { subject: string; text: string; html: string };

const C = {
  paper: "#f6efe6",
  card: "#ffffff",
  ink: "#2a211b",
  muted: "#675a4f",
  line: "#e6d9c8",
  blue: "#2f66d4",
  cta: "#b4531f",
};

function layout(opts: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
      <tr><td style="padding:0 4px 18px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${C.ink};">
        <span style="color:${C.blue};font-style:italic;letter-spacing:-0.5px;">iSN</span>
        <span style="color:${C.line};padding:0 8px;">|</span>MS Dashboard
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:32px 30px;font-family:Arial,Helvetica,sans-serif;color:${C.ink};">
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:${C.ink};">${escapeHtml(opts.heading)}</h1>
        ${opts.body}
      </td></tr>
      <tr><td style="padding:18px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${C.muted};text-align:center;">
        Built by iSN. Built for Mystery Shopping.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const p = (html: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.muted};">${html}</p>`;

function detailsBlock(lead: LeadPayload): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 14px 4px 0;font-size:13px;color:${C.muted};">${label}</td><td style="padding:4px 0;font-size:13px;color:${C.ink};">${escapeHtml(value)}</td></tr>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 4px;border-top:1px solid ${C.line};padding-top:10px;width:100%;">
    ${row("Name", lead.name)}${row("Company", lead.company)}${row("Phone", lead.phone)}${row("Email", lead.email)}
  </table>`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

/** The email the visitor gets: a meeting confirmation with the link, or a plain confirmation. */
export function buildConfirmationEmail(lead: LeadPayload, meeting?: BookedMeeting): Rendered {
  const hi = escapeHtml(firstName(lead.name));

  if (meeting) {
    const subject = `Your MS Dashboard call is booked: ${meeting.when}`;
    const html = layout({
      preheader: `Your call with the iSN team is booked for ${meeting.when}.`,
      heading: "Your meeting is booked",
      body: [
        p(`Hi ${hi}, thank you for your interest in MS Dashboard. Here are the details of your call with the iSN team.`),
        `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:6px 0 18px;background:#f8f2e9;border-radius:14px;">
          <tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:${C.ink};">
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">When</div>
            <div style="font-size:16px;font-weight:700;margin-bottom:10px;">${escapeHtml(meeting.when)}</div>
            <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">Duration</div>
            <div style="font-weight:700;">${meeting.durationMin} minutes</div>
          </td></tr>
        </table>`,
        `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px;"><tr><td style="background:${C.cta};border-radius:999px;">
          <a href="${escapeHtml(meeting.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Join the meeting</a>
        </td></tr></table>`,
        p(`Or open this link: <a href="${escapeHtml(meeting.url)}" style="color:${C.blue};">${escapeHtml(meeting.url)}</a>`),
        p("A calendar invite is attached. If you need to change the time, just reply to this email."),
        `<div style="margin-top:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">Details you shared</div>`,
        detailsBlock(lead),
      ].join(""),
    });
    const text = [
      `Hi ${firstName(lead.name)},`,
      "",
      "Thank you for your interest in MS Dashboard. Your call with the iSN team is booked.",
      "",
      `When: ${meeting.when}`,
      `Duration: ${meeting.durationMin} minutes`,
      `Meeting link: ${meeting.url}`,
      "",
      "A calendar invite is attached. If you need to change the time, just reply to this email.",
      "",
      "Details you shared:",
      `Name: ${lead.name}`,
      `Company: ${lead.company}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email}`,
      "",
      "Built by iSN. Built for Mystery Shopping.",
    ].join("\n");
    return { subject, text, html };
  }

  const subject = "Thanks for your interest in MS Dashboard";
  const html = layout({
    preheader: "We have received your details and will be in touch shortly.",
    heading: "We've received your details",
    body: [
      p(
        `Hi ${hi}, thank you for getting in touch about MS Dashboard. The iSN team will contact you shortly to explore how it can simplify the way you manage and report your Mystery Shopping data.`,
      ),
      p("If you would like to talk sooner, just reply to this email."),
      `<div style="margin-top:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">Details you shared</div>`,
      detailsBlock(lead),
    ].join(""),
  });
  const text = [
    `Hi ${firstName(lead.name)},`,
    "",
    "Thank you for getting in touch about MS Dashboard. The iSN team will contact you shortly to explore how it can simplify the way you manage and report your Mystery Shopping data.",
    "",
    "If you would like to talk sooner, just reply to this email.",
    "",
    "Details you shared:",
    `Name: ${lead.name}`,
    `Company: ${lead.company}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    "",
    "Built by iSN. Built for Mystery Shopping.",
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
