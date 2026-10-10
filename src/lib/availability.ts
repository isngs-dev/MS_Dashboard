/**
 * Which times can be booked.
 *
 * The team takes calls during working hours in one time zone (MEETING_TIMEZONE, MEETING_HOURS);
 * the visitor sees the matching start times on their chosen date, in their own time zone.
 * Server-only (reads the environment), but free of Node-specific imports.
 */
import { isValidTimeZone, zonedTimeToUtc } from "@/lib/time";

/** Slots are offered every 30 minutes. */
const STEP_MIN = 30;

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_HOURS = { startMin: 9 * 60, endMin: 18 * 60 };

export type WorkingHours = { timeZone: string; startMin: number; endMin: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** Length of the booked call in minutes (MEETING_DURATION_MIN, 15 to 120, default 30). */
export function meetingDuration(): number {
  const n = Number(process.env.MEETING_DURATION_MIN);
  return Number.isFinite(n) && n >= 15 && n <= 120 ? Math.round(n) : 30;
}

/** MEETING_TIMEZONE (IANA zone) and MEETING_HOURS ("09:00-18:00", local to that zone). */
export function workingHours(): WorkingHours {
  const zone = process.env.MEETING_TIMEZONE?.trim();
  const timeZone = zone && isValidTimeZone(zone) ? zone : DEFAULT_TIMEZONE;

  const match = (process.env.MEETING_HOURS ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (match) {
    const startMin = Number(match[1]) * 60 + Number(match[2]);
    const endMin = Number(match[3]) * 60 + Number(match[4]);
    if (Number(match[2]) < 60 && Number(match[4]) < 60 && startMin >= 0 && endMin <= 24 * 60 && endMin > startMin) {
      return { timeZone, startMin, endMin };
    }
  }
  return { timeZone, ...DEFAULT_HOURS };
}

/** Minutes since midnight, in `timeZone`, for an instant. Built once per zone because Intl formatters are slow to create. */
function minuteOfDayIn(timeZone: string): (at: Date) => number {
  const format = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
  return (at) => {
    const parts = format.formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return get("hour") * 60 + get("minute");
  };
}

/** True when a call starting at `start` and lasting `durationMin` fits inside the working hours. */
export function withinWorkingHours(start: Date, durationMin: number, hours: WorkingHours = workingHours()): boolean {
  const minute = minuteOfDayIn(hours.timeZone)(start);
  return minute >= hours.startMin && minute + durationMin <= hours.endMin;
}

export type CandidateSlot = {
  /** HH:mm on the visitor's wall clock */
  time: string;
  start: Date;
};

/** Every bookable start time on `date` (YYYY-MM-DD) in the visitor's `timeZone`, earliest first. */
export function candidateSlots(date: string, timeZone: string, durationMin: number, hours: WorkingHours = workingHours()): CandidateSlot[] {
  const minuteOfDay = minuteOfDayIn(hours.timeZone);
  const seen = new Set<number>();
  const slots: CandidateSlot[] = [];

  for (let m = 0; m < 24 * 60; m += STEP_MIN) {
    const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const start = zonedTimeToUtc(date, time, timeZone);
    if (!start || seen.has(start.getTime())) continue; // clock changes can repeat or skip a wall-clock time
    seen.add(start.getTime());

    const minute = minuteOfDay(start);
    if (minute >= hours.startMin && minute + durationMin <= hours.endMin) slots.push({ time, start });
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}
