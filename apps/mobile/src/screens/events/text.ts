/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — the text and
 * date helpers the events screens use, mirrored natively: `t()` from the
 * catalogs and the Hermes `Intl` formatters, the same routing the web's
 * `@/lib/locale-format` (`fmtDate` / `fmtTime`) gives. Event start times read
 * "Mon. · 19:30" like `formatEventTime` in the web hub.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';

type Options = Intl.DateTimeFormatOptions;

export function fmtDate(language: string, d: Date | string, opts?: Options): string {
  return new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);
}

export function fmtTime(language: string, d: Date | string, opts?: Options): string {
  return new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);
}

/** The card and drawer start label: weekday, date and 24-hour time, as the web hub shows it. */
export function eventTimeLabel(iso: string, language: string): string {
  const date = new Date(iso);
  const time = fmtTime(language, date, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = fmtDate(language, date, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
}

export function useEventsText() {
  const { t, language, rtl } = useI18n();
  return useMemo(
    () => ({
      t: (key: string, params?: Params): string => t(key, params),
      language,
      rtl,
      fmtDate: (d: Date | string, opts?: Options) => fmtDate(language, d, opts),
      fmtTime: (d: Date | string, opts?: Options) => fmtTime(language, d, opts),
      eventTimeLabel: (iso: string) => eventTimeLabel(iso, language),
    }),
    [t, language, rtl],
  );
}
