/** Minimal RFC 5545 calendar invite so the booking lands in the visitor's calendar. */

const CRLF = "\r\n";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escape TEXT values: backslash, newline, comma, semicolon. */
const text = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** Parameter values may not contain quotes, CR or LF. */
const param = (s: string) => s.replace(/["\r\n]/g, "").trim();

/** Lines longer than 75 chars are folded with CRLF + space. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join(CRLF);
}

export type IcsInput = {
  uid: string;
  start: Date;
  durationMin: number;
  summary: string;
  description: string;
  url: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
};

export function buildIcs(i: IcsInput): string {
  const end = new Date(i.start.getTime() + i.durationMin * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iSN//MS Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${i.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(i.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(i.summary)}`,
    `DESCRIPTION:${text(i.description)}`,
    `LOCATION:${text(i.url)}`,
    `URL:${i.url}`,
    `ORGANIZER;CN="${param(i.organizer.name)}":mailto:${i.organizer.email}`,
    `ATTENDEE;CN="${param(i.attendee.name)}";RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${i.attendee.email}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}
