/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the text helpers the AI
 * coach pages share: the catalog `t()` bound to the member's language, the
 * web `fmtDate` / `formatDate(…, "EEE HH:mm")` locale helpers
 * (`src/lib/locale-format.ts`) over Hermes `Intl`, and the labels the web
 * prints raw (priority, price). Every word comes from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';

export type Priority = 'high' | 'medium' | 'low';

export type CoachText = ReturnType<typeof buildText>;

function buildText(t: (key: string, params?: Params) => string, language: string) {
  const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(language, opts).format(n);
  const fmtDate = (d: Date, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(d);
  /** `EEE HH:mm` (SmartCalendarCard): short weekday + 24 h time. */
  const fmtWeekdayTime = (iso: string) => {
    const d = new Date(iso);
    return `${fmtDate(d, { weekday: 'short' })} ${fmtDate(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
  };
  /** The web prints `$199` (OfferCard formatPrice / LabTestCard): USD without decimals. */
  const fmtUsd = (n: number) => fmtNumber(n, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const priority = (p: Priority) => t(`aiCoachNative.priority.${p}`);
  /** A daily learning's `YYYY-MM-DD` at noon (web `new Date(`${date}T12:00:00`)`), long weekday + day + month. */
  const learningDate = (date: string) => fmtDate(new Date(`${date}T12:00:00`), { weekday: 'long', day: 'numeric', month: 'long' });
  return { t, language, fmtNumber, fmtDate, fmtWeekdayTime, fmtUsd, priority, learningDate };
}

export function useCoachText(): CoachText {
  const { t, language } = useI18n();
  return useMemo(() => buildText(t, language), [t, language]);
}
