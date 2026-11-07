/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — the live-room labels, as the web's
 * `liveRoomFormat.ts` and the mobile carousel's `formatRoomWhen` produce them. Every phrase comes
 * from the catalog through the `t` the caller passes in. Dates and times use `Intl.DateTimeFormat`
 * with the viewer's locale: the native port of `@/lib/locale-format`, which cannot cross the core
 * bridge (its `i18n-toast` import is class C).
 */

export type Translate = (key: string, params?: Record<string, string | number>) => string;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "45 min", "1 h", "1 h 30 min" in the catalog's wording. Null when the length is unknown. */
export function formatRoomDuration(minutes: number | null | undefined, t: Translate): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('screens.liverooms.durationMin', { value0: m });
  if (m === 0) return t('screens.liverooms.durationHour', { value0: h });
  return t('screens.liverooms.durationHourMin', { value0: h, value1: m });
}

/** The 24-hour clock used by the live-room labels: "20:05". */
export function formatClock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** The dotted 24-hour time of the scheduled-card label: "20.05". */
function formatDottedTime(d: Date): string {
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * The relative "when" of a scheduled room: today, tomorrow, within a week (weekday + day + month),
 * or further out (day + month). The time is the dotted 24-hour form with an "h" suffix.
 */
export function formatScheduledWhen(iso: string, locale: string, t: Translate, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = `${formatDottedTime(d)}h`;
  const dayDiff = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  if (dayDiff <= 0) return t('screens.liverooms.whenToday', { time });
  if (dayDiff === 1) return t('screens.liverooms.whenTomorrow', { time });
  const date =
    dayDiff <= 7
      ? formatIntl(d, locale, { weekday: 'short', day: '2-digit', month: 'short' })
      : formatIntl(d, locale, { day: '2-digit', month: 'short' });
  return t('screens.liverooms.whenDated', { date, time });
}

/** A date or time in the viewer's locale. `timeZone` is 'UTC' for the drawer's UTC view. */
export function formatIntl(d: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/** Relative distance to a near start time: "in 47 minutes" or "in 2 hours". */
export function formatCountdown(d: Date, locale: string, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMinutes = Math.round((d.getTime() - now) / 60_000);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  return rtf.format(Math.round(diffMinutes / 60), 'hour');
}
