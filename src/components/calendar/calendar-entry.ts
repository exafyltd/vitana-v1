/**
 * Where a calendar request lands (VTID-04528).
 *
 * The calendar lives at /calendar (VTID-04351). Every button, drawer item,
 * voice command ("open my calendar") and deep link that asks for the
 * calendar goes there. The one exception is a request for the reminders
 * list — the reminder push deep link and "show my reminders" — which the
 * new screen does not have; those still open the popup on its Reminders tab.
 */
export const CALENDAR_ROUTE = "/calendar";

export type CalendarOpenTab = "agenda" | "month" | "reminders";

/** True when the request is for the reminders list, which only the popup shows. */
export function opensRemindersPopup(tab?: CalendarOpenTab): boolean {
  return tab === "reminders";
}
