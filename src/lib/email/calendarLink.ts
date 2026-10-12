/**
 * "Add to Google Calendar" link for the confirmation email. A plain link instead of an
 * attached calendar file: attachments make a message look more like spam to mail filters.
 */
export function googleCalendarLink(input: { start: Date; durationMin: number; title: string; details: string; location: string }): string {
  // Google wants UTC basic format: 20261016T150000Z
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(input.start.getTime() + input.durationMin * 60_000);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${stamp(input.start)}/${stamp(end)}`);
  url.searchParams.set("details", input.details);
  url.searchParams.set("location", input.location);
  return url.toString();
}
