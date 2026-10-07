/**
 * Where a calendar request lands (VTID-04528, VTID-04915).
 *
 * The calendar lives at /calendar (VTID-04351). Every button, drawer item,
 * voice command ("open my calendar") and deep link that asks for the
 * calendar goes there. A request for the reminders list — "show my
 * reminders" — goes to /reminders. The older popup that used to show that
 * list was retired in VTID-04915.
 */
export const CALENDAR_ROUTE = "/calendar";
export const REMINDERS_ROUTE = "/reminders";

export type CalendarOpenTab = "agenda" | "month" | "reminders";

/** True when the request is for the reminders list. */
export function opensReminders(tab?: CalendarOpenTab): boolean {
  return tab === "reminders";
}

/** The page a `calendar:open` request lands on. */
export function calendarTargetFor(tab?: CalendarOpenTab): string {
  return opensReminders(tab) ? REMINDERS_ROUTE : CALENDAR_ROUTE;
}
