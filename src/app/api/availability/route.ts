import { NextResponse } from "next/server";
import { candidateSlots, meetingDuration } from "@/lib/availability";
import { googleConfig, listBusyCached, type BusyWindow } from "@/lib/google/calendar";
import { allow, clientIp } from "@/lib/rateLimit";
import { isDateString, isValidTimeZone } from "@/lib/time";
import { MAX_DAYS_AHEAD, MIN_LEAD_MINUTES } from "@/lib/validation";

export const runtime = "nodejs";

const DAY_MS = 86_400_000;

/**
 * GET /api/availability?date=YYYY-MM-DD&tz=America/New_York
 *
 * The bookable start times on that date (wall clock in `tz`), each flagged `busy` when the
 * team's Google Calendar already has something then (or the time has passed). It only ever
 * reveals free / busy, never what the events are. The booking endpoint re-checks the slot,
 * so this is for showing the picker, not for security.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const timeZone = params.get("tz") ?? "";
  if (!isDateString(date) || !isValidTimeZone(timeZone)) return json({ ok: false, error: "invalid_params" }, 400);

  if (!allow(`availability:${clientIp(request)}`, 120, 10 * 60_000)) return json({ ok: false, error: "rate_limited" }, 429);

  const now = Date.now();
  const durationMin = meetingDuration();
  const slots = candidateSlots(date, timeZone, durationMin);

  let busy: BusyWindow[] = [];
  let checked = false;
  const google = googleConfig();
  if (google && slots.length > 0) {
    const from = slots[0].start;
    const to = new Date(slots[slots.length - 1].start.getTime() + durationMin * 60_000);
    try {
      busy = await listBusyCached(google, from, to);
      checked = true;
    } catch (error) {
      // Show the times anyway: the booking itself is checked again, so nobody gets a double booking.
      console.error("[availability] Google free/busy failed:", error instanceof Error ? error.message : error);
    }
  }

  const earliest = now + MIN_LEAD_MINUTES * 60_000;
  const latest = now + MAX_DAYS_AHEAD * DAY_MS;

  return json({
    ok: true,
    durationMin,
    checked,
    slots: slots.map(({ time, start }) => {
      const from = start.getTime();
      const to = from + durationMin * 60_000;
      const unavailable = from < earliest || from > latest || busy.some((b) => b.start.getTime() < to && b.end.getTime() > from);
      return { time, busy: unavailable };
    }),
  });
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
