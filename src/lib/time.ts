/**
 * Time helpers shared by the browser and the API route (no Node-only imports).
 *
 * The visitor picks a wall-clock date and time in their own IANA time zone
 * (e.g. "Africa/Lagos"); the server needs the real UTC instant to build the
 * calendar invite and to check the booking is in the future.
 */

/**
 * The time zone every booking is offered in. "America/New_York" is Eastern Time: it follows
 * daylight saving by itself (EST in winter, EDT in summer), which a fixed UTC-5 would not.
 */
export const BOOKING_TIME_ZONE = "America/New_York";

/** YYYY-MM-DD of an instant on the wall clock of `timeZone`. */
export function dateInZone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDateString = (v: string) => DATE_RE.test(v);
export const isTimeString = (v: string) => TIME_RE.test(v);

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at the instant `at`, in ms (positive = ahead of UTC). */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

/**
 * Wall-clock `date` (YYYY-MM-DD) + `time` (HH:mm) in `timeZone` -> the UTC instant.
 * Returns null for malformed input, unknown zones or impossible dates (e.g. 2026-02-31).
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  if (!isDateString(date) || !isTimeString(time) || !isValidTimeZone(timeZone)) return null;

  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);

  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;

  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // two passes settle the offset around daylight-saving changes
  let utc = wall;
  for (let i = 0; i < 2; i++) utc = wall - offsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** "Tue, Oct 14, 3:00 PM EDT" in the given zone (short enough for an email subject). */
export function formatMeetingShort(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

/** "Tuesday, October 14, 2026 at 3:00 PM EDT" in the given zone. */
export function formatMeeting(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}
