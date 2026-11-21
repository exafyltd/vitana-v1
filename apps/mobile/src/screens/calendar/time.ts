/**
 * VTID-05530 — date maths and wording for the calendar screen: the native twin of the web's
 * `vcal/time.ts`. Pure functions (no React, no `date-fns`), tested in tests/calendar/rules.test.ts.
 * Every date and time that reaches the member is formatted by `format.ts`, never here.
 */
import type { ReminderRule } from './data/api';
import type { Formatters } from './format';

export type CalendarView = 'day' | 'week' | 'month';
export type Translate = (key: string, params?: Record<string, string | number>) => string;

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

/** The Monday on or before `d`, at local midnight. Weeks start on Monday. */
export function weekStart(d: Date): Date {
  const day = startOfDay(d);
  const back = (day.getDay() + 6) % 7;
  return addDays(day, -back);
}

/** [from, to) the view needs from the gateway. */
export function viewRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === 'day') {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (view === 'week') {
    const from = weekStart(anchor);
    return { from, to: addDays(from, 7) };
  }
  // Month: the full 6-week grid, so leading and trailing days show their dots too.
  const from = weekStart(startOfMonth(anchor));
  return { from, to: addDays(from, 42) };
}

export function stepAnchor(view: CalendarView, anchor: Date, dir: 1 | -1): Date {
  if (view === 'day') return addDays(anchor, dir);
  if (view === 'week') return addDays(anchor, 7 * dir);
  return addMonths(startOfMonth(anchor), dir);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `YYYY-M-D` of a local day, the key of a month cell. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "in 12 min", "in 3 h", "in 2 days", "now" — never negative. */
export function relativeIn(targetIso: string, now: Date, t: Translate): string {
  const mins = Math.round((Date.parse(targetIso) - now.getTime()) / 60_000);
  if (mins <= 0) return t('vcal.rel.now');
  if (mins < 60) return t('vcal.rel.minutes', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 36) return t('vcal.rel.hours', { count: hours });
  return t('vcal.rel.days', { count: Math.round(hours / 24) });
}

/** Chip text for one reminder rule. */
export function reminderLabel(rule: ReminderRule, t: Translate, fmt: Formatters): string {
  if (rule.kind === 'evening_before') {
    const d = new Date();
    d.setHours(rule.hour, 0, 0, 0);
    return t('vcal.reminder.eveningBefore', { time: fmt.hhmm(d) });
  }
  if (rule.minutes === 0) return t('vcal.reminder.atStart');
  if (rule.minutes % 60 === 0) return t('vcal.reminder.hoursBefore', { count: rule.minutes / 60 });
  return t('vcal.reminder.minutesBefore', { count: rule.minutes });
}

/** The next reminder still to come for this start, or null. */
export function nextReminderAt(rules: ReminderRule[] | undefined, startIso: string, now: Date): Date | null {
  if (!rules?.length) return null;
  const start = new Date(startIso);
  const times = rules.map((r) => {
    if (r.kind === 'before') return new Date(start.getTime() - r.minutes * 60_000);
    const d = addDays(startOfDay(start), -1);
    d.setHours(r.hour, 0, 0, 0);
    return d;
  });
  const future = times.filter((d) => d.getTime() >= now.getTime()).sort((a, b) => a.getTime() - b.getTime());
  return future[0] ?? null;
}

/** A Date as the value of a `datetime-local` input in the device's time (the web's edit/move value). */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Rounds up to the next 15-minute slot (the add form's default start). */
export function roundToNext15(d: Date): Date {
  const out = new Date(d);
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  out.setMinutes(m, 0, 0);
  return out;
}

/** The same local day as `day`, at `hour:minute`. */
export function atTime(day: Date, hour: number, minute: number): Date {
  const out = new Date(day);
  out.setHours(hour, minute, 0, 0);
  return out;
}
