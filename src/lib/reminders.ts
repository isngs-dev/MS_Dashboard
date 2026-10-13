/**
 * Reminder emails: "you have a call tomorrow".
 *
 * There is no database. Every call booked on the website is a Google Calendar event that carries the
 * visitor's name and email, so the calendar is the record. A job looks at the calls starting in the
 * next 24 hours, emails the visitor once and marks the event ("reminderSent") so it is never repeated.
 *
 * Who runs the job:
 *   - the server itself every few minutes, when REMINDERS_ENABLED=true (see src/instrumentation.ts), and/or
 *   - an outside scheduler calling GET/POST /api/reminders with CRON_SECRET.
 * Both can run together: the flag stops a second email.
 */
import { buildReminderEmail } from "@/lib/email/templates";
import { googleCalendarLink } from "@/lib/email/calendarLink";
import { emailConfig, isEmailConfigured, sendMail } from "@/lib/email/gmail";
import { googleConfig, listWebsiteBookings, setReminderFlag } from "@/lib/google/calendar";
import { dateInZone, formatMeeting, formatMeetingShort } from "@/lib/time";

const HOUR = 3_600_000;
/** Remind when the call is at most this far away ... */
const REMIND_WITHIN_MS = 24 * HOUR;
/** ... but not in the last hour before it (too late to be useful). */
const TOO_LATE_MS = 1 * HOUR;
/**
 * A call booked less than 25 hours ahead gets no reminder: the visitor was told about it a moment ago,
 * and "your call is tomorrow" straight after the confirmation would only be noise.
 */
const MIN_NOTICE_MS = 25 * HOUR;

export type ReminderRun = {
  /** calls found in the next 24 hours */
  checked: number;
  /** of those, how many need a reminder */
  due: number;
  sent: number;
  failed: number;
};

export async function sendDueReminders(options: { dryRun?: boolean; now?: Date } = {}): Promise<ReminderRun> {
  const now = options.now ?? new Date();
  const google = googleConfig();
  const mail = emailConfig();
  if (!google || !isEmailConfigured(mail)) throw new Error("Reminders need the Google credentials and MAIL_FROM_EMAIL");

  const from = new Date(now.getTime() + TOO_LATE_MS);
  const to = new Date(now.getTime() + REMIND_WITHIN_MS);
  const bookings = await listWebsiteBookings(google, from, to);

  const due = bookings.filter(
    (b) => !b.reminded && b.visitor && b.meetUrl && (!b.created || b.start.getTime() - b.created.getTime() >= MIN_NOTICE_MS),
  );
  const result: ReminderRun = { checked: bookings.length, due: due.length, sent: 0, failed: 0 };
  if (options.dryRun) return result;

  for (const booking of due) {
    const visitor = booking.visitor;
    const url = booking.meetUrl;
    if (!visitor || !url) continue;

    const durationMin = Math.round((booking.end.getTime() - booking.start.getTime()) / 60_000);
    const day = dateInZone(booking.start, booking.timeZone) === dateInZone(now, booking.timeZone) ? "today" : "tomorrow";
    const email = buildReminderEmail(
      { name: visitor.name },
      {
        when: formatMeeting(booking.start, booking.timeZone),
        whenShort: formatMeetingShort(booking.start, booking.timeZone),
        durationMin,
        url,
        calendarUrl: googleCalendarLink({
          start: booking.start,
          durationMin,
          title: "MS Dashboard call with iSN",
          details: `Your MS Dashboard call with the iSN team.\nJoin: ${url}`,
          location: url,
        }),
      },
      day,
    );

    try {
      // Mark first, send second: if marking fails nothing is sent, and a crash in between can at worst
      // skip one reminder, never send the same one every few minutes.
      await setReminderFlag(google, booking.id, true);
      try {
        await sendMail(mail, { to: { email: visitor.email, name: visitor.name }, ...email });
        result.sent += 1;
      } catch (error) {
        await setReminderFlag(google, booking.id, false).catch(() => undefined); // try again on the next run
        throw error;
      }
    } catch (error) {
      result.failed += 1;
      console.error("[reminders] could not send a reminder:", error instanceof Error ? error.message : error);
    }
  }
  return result;
}

/** Runs the job now and then for as long as the server lives. Safe to call more than once. */
export function startReminderScheduler(): void {
  const state = globalThis as typeof globalThis & { __msReminderTimer?: ReturnType<typeof setInterval> };
  if (state.__msReminderTimer) return;

  const minutes = Number(process.env.REMINDER_CHECK_MINUTES);
  const everyMs = (Number.isFinite(minutes) && minutes >= 1 ? minutes : 10) * 60_000;

  const run = async () => {
    try {
      const result = await sendDueReminders();
      if (result.sent || result.failed) console.log(`[reminders] sent ${result.sent}, failed ${result.failed}`);
    } catch (error) {
      console.error("[reminders] run failed:", error instanceof Error ? error.message : error);
    }
  };

  state.__msReminderTimer = setInterval(run, everyMs);
  state.__msReminderTimer.unref?.(); // never keeps the process alive on its own
  setTimeout(run, 30_000).unref?.(); // first look shortly after start-up
  console.log(`[reminders] scheduler on: checking every ${everyMs / 60_000} minutes`);
}
