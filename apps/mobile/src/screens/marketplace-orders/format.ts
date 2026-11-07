/**
 * VTID-05511 — the date / number formats the marketplace, orders and ticket
 * screens show. The web formats with `formatDate(d, pattern)` from
 * `src/lib/locale-format.ts` (date-fns with the UI language's locale) — class B
 * (it imports the web date-fns locale table), so each pattern the screens use
 * is mapped here onto Hermes `Intl` with the same locale, the way the
 * public-profile and diary lanes format dates.
 */
export type DatePattern =
  | 'MMM d, yyyy'
  | 'MMM d'
  | 'MMM dd, yyyy'
  | 'PPP'
  | 'h:mm a'
  | 'HH:mm'
  | 'EEE, MMM d, yyyy'
  | 'EEEE, MMMM dd, yyyy'
  | 'EEEE, MMMM d, yyyy • h:mm a'
  | 'EEE, MMM d • h:mm a'
  | "EEE, MMM d, yyyy 'at' h:mm a"
  | 'yyyyMMdd';

const OPTS: Partial<Record<DatePattern, Intl.DateTimeFormatOptions>> = {
  'MMM d, yyyy': { month: 'short', day: 'numeric', year: 'numeric' },
  'MMM d': { month: 'short', day: 'numeric' },
  'MMM dd, yyyy': { month: 'short', day: '2-digit', year: 'numeric' },
  PPP: { month: 'long', day: 'numeric', year: 'numeric' },
  'h:mm a': { hour: 'numeric', minute: '2-digit' },
  'HH:mm': { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  'EEE, MMM d, yyyy': { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  'EEEE, MMMM dd, yyyy': { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' },
};

function fmt(d: Date, locale: string, o: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale, o).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', o).format(d);
  }
}

/** `formatDate(d, pattern)` in `locale` (the UI language). */
export function formatDate(d: Date, pattern: DatePattern, locale: string): string {
  if (pattern === 'yyyyMMdd') return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  if (pattern === 'EEEE, MMMM d, yyyy • h:mm a')
    return `${fmt(d, locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${fmt(d, locale, OPTS['h:mm a'] as Intl.DateTimeFormatOptions)}`;
  if (pattern === 'EEE, MMM d • h:mm a') return `${fmt(d, locale, { weekday: 'short', month: 'short', day: 'numeric' })} • ${fmt(d, locale, OPTS['h:mm a'] as Intl.DateTimeFormatOptions)}`;
  if (pattern === "EEE, MMM d, yyyy 'at' h:mm a")
    return `${fmt(d, locale, OPTS['EEE, MMM d, yyyy'] as Intl.DateTimeFormatOptions)} · ${fmt(d, locale, OPTS['h:mm a'] as Intl.DateTimeFormatOptions)}`;
  return fmt(d, locale, OPTS[pattern] as Intl.DateTimeFormatOptions);
}

/** `fmtDateTime(n)` / `fmtNumber(n)` for a count (the provider's bookings): grouped digits in `locale`. */
export function formatCount(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

/** date-fns `isPast`. */
export function isPast(d: Date, now: Date = new Date()): boolean {
  return d.getTime() < now.getTime();
}
