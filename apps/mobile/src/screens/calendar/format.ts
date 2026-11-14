/**
 * VTID-05530 (native-wave2-events-calendar-r3/calendar-reminders) — the native twin of the web's
 * `@/lib/locale-format` (`fmtDate`, `fmtTime`, `fmtDateTime`, `fmtNumber`, `formatDate`). The web
 * module cannot cross the @vitana/core bridge (it imports `i18n-toast` and the date-fns locale
 * table, both class C), so the calendar formats through `Intl` in the viewer's catalog locale.
 * This is the ONLY file in the lane that touches `Intl`; every screen formats through a
 * `makeFormatters(locale)` instance (the `useFormat()` hook). No raw `toLocale*` calls anywhere.
 */

export type DateInput = Date | string | number;
export type DateOptions = Intl.DateTimeFormatOptions;

/** The catalog code (`de`, `pt`, `zh`, …) as the BCP-47 tag the date names should follow. */
export function intlLocale(locale: string): string {
  switch (locale) {
    case 'pt':
      return 'pt-BR'; // the web maps pt to date-fns ptBR (VTID-03577)
    case 'zh':
      return 'zh-CN';
    case 'sr':
      return 'sr-RS';
    default:
      return locale;
  }
}

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

const valid = (d: Date) => !Number.isNaN(d.getTime());

export function makeFormatters(locale: string) {
  const tag = intlLocale(locale);
  const cache = new Map<string, Intl.DateTimeFormat>();
  const dtf = (options: DateOptions) => {
    const key = JSON.stringify(options);
    let f = cache.get(key);
    if (!f) {
      f = new Intl.DateTimeFormat(tag, options);
      cache.set(key, f);
    }
    return f;
  };

  const run = (input: DateInput, options: DateOptions): string => {
    const d = toDate(input);
    return valid(d) ? dtf(options).format(d) : String(input);
  };

  /** A date: `fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })`. */
  const fmtDate = (input: DateInput, options: DateOptions = { dateStyle: 'medium' }): string => run(input, options);
  /** A time of day: `fmtTime(d, { hour: '2-digit', minute: '2-digit' })`. */
  const fmtTime = (input: DateInput, options: DateOptions = { timeStyle: 'short' }): string => run(input, options);
  /** A date and time together. */
  const fmtDateTime = (input: DateInput, options: DateOptions = { dateStyle: 'medium', timeStyle: 'short' }): string => run(input, options);
  const fmtNumber = (n: number, options?: Intl.NumberFormatOptions): string => new Intl.NumberFormat(tag, options).format(n);

  /**
   * The few date-fns patterns the calendar uses: `LLLL yyyy` (month and year), `EEE` (short weekday),
   * `EEEEEE` (two-letter weekday), `d` (day of month) and `HH:mm`.
   */
  const formatDate = (input: DateInput, pattern: string): string => {
    const d = toDate(input);
    if (!valid(d)) return String(input);
    switch (pattern) {
      case 'LLLL yyyy':
        return dtf({ month: 'long', year: 'numeric' }).format(d);
      case 'EEE':
        return dtf({ weekday: 'short' }).format(d);
      case 'EEEEEE':
        return Array.from(dtf({ weekday: 'short' }).format(d).replace(/\.$/, '')).slice(0, 2).join('');
      case 'd':
        return dtf({ day: 'numeric' }).format(d);
      case 'HH:mm':
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      default:
        throw new Error(`formatDate: unsupported pattern ${pattern}`);
    }
  };

  /** `hh:mm` in the viewer's clock (the calendar's `hhmm`). */
  const hhmm = (input: DateInput): string => fmtTime(input, { hour: '2-digit', minute: '2-digit' });
  const timeRange = (start: DateInput, end: DateInput | null): string => (end ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start));

  return { locale, fmtDate, fmtTime, fmtDateTime, fmtNumber, formatDate, hhmm, timeRange };
}

export type Formatters = ReturnType<typeof makeFormatters>;

/** The device's IANA time zone (`Europe/Berlin`), `UTC` when it cannot be read. */
export function deviceTimeZone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
