/**
 * VTID-04351 — date maths and wording for the calendar screen.
 * Pure functions (no React), unit-tested in time.test.ts.
 */
import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { fmtTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import type { ReminderRule } from "@/lib/calendar-window-client";

export type CalendarView = "day" | "week" | "month";

/** [from, to) the view needs from the gateway. Weeks start on Monday. */
export function viewRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === "day") {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (view === "week") {
    const from = startOfWeek(anchor, { weekStartsOn: 1 });
    return { from, to: addDays(from, 7) };
  }
  // Month: the full 6-week grid, so leading/trailing days show their dots too.
  const from = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  return { from, to: addDays(from, 42) };
}

export function stepAnchor(view: CalendarView, anchor: Date, dir: 1 | -1): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, 7 * dir);
  return addMonths(startOfMonth(anchor), dir);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function hhmm(iso: string | Date): string {
  return fmtTime(iso, { hour: "2-digit", minute: "2-digit" });
}

export function timeRange(start: string, end: string | null): string {
  return end ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start);
}

export function greetingKey(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "vcal.greeting.night";
  if (h < 12) return "vcal.greeting.morning";
  if (h < 18) return "vcal.greeting.afternoon";
  return "vcal.greeting.evening";
}

/** "in 12 Min.", "in 3 Std.", "in 2 Tagen", "jetzt" — never negative. */
export function relativeIn(targetIso: string, now: Date): string {
  const mins = Math.round((Date.parse(targetIso) - now.getTime()) / 60_000);
  if (mins <= 0) return t("vcal.rel.now");
  if (mins < 60) return t("vcal.rel.minutes", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 36) return t("vcal.rel.hours", { count: hours });
  return t("vcal.rel.days", { count: Math.round(hours / 24) });
}

/** Chip text for one reminder rule, and the moment it fires for this start. */
export function reminderLabel(rule: ReminderRule): string {
  if (rule.kind === "evening_before") {
    const d = new Date();
    d.setHours(rule.hour, 0, 0, 0);
    return t("vcal.reminder.eveningBefore", { time: hhmm(d) });
  }
  if (rule.minutes === 0) return t("vcal.reminder.atStart");
  if (rule.minutes % 60 === 0) return t("vcal.reminder.hoursBefore", { count: rule.minutes / 60 });
  return t("vcal.reminder.minutesBefore", { count: rule.minutes });
}

/** The next reminder still to come for this start, or null. */
export function nextReminderAt(rules: ReminderRule[] | undefined, startIso: string, now: Date): Date | null {
  if (!rules?.length) return null;
  const start = new Date(startIso);
  const times = rules.map((r) => {
    if (r.kind === "before") return new Date(start.getTime() - r.minutes * 60_000);
    const d = addDays(startOfDay(start), -1);
    d.setHours(r.hour, 0, 0, 0);
    return d;
  });
  const future = times.filter((d) => d.getTime() >= now.getTime()).sort((a, b) => a.getTime() - b.getTime());
  return future[0] ?? null;
}

/** VTID-04374: A Date as the value of <input type="datetime-local"> in the device's time. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
