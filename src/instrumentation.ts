/** Runs once when the server starts. Starts the reminder job when REMINDERS_ENABLED=true (see lib/reminders.ts). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.REMINDERS_ENABLED !== "true") return;

  const { startReminderScheduler } = await import("./lib/reminders");
  startReminderScheduler();
}
