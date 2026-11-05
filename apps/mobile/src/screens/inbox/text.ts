/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the text helpers
 * of the inbox list, MIRRORED natively over the native `t()` and Hermes
 * `Intl`:
 *  - `cardTime` — `MobileConversationCard`'s `formatDistanceToNow(ts,
 *    { addSuffix: false })` with the English unit shortening ("5m", "3h",
 *    "2d"): date-fns' distance buckets, the number + unit from
 *    `Intl.NumberFormat` (`unitDisplay: narrow` in English, which is the
 *    shortened form; long elsewhere, where the web replacements match nothing),
 *  - `fmtDate` (`src/lib/locale-format.ts`) for the Archived sample dates,
 *  - the display fallbacks (`unknown`, `conversation`) of the title helpers.
 * Every word comes from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';

type Unit = 'minute' | 'hour' | 'day' | 'month' | 'year';

/** date-fns `formatDistance` buckets (no seconds): value + unit. */
export function distanceBucket(fromMs: number, toMs: number): { value: number; unit: Unit } {
  const minutes = Math.round(Math.abs(toMs - fromMs) / 60_000);
  if (minutes < 45) return { value: Math.max(1, minutes), unit: 'minute' };
  if (minutes < 90) return { value: 1, unit: 'hour' };
  if (minutes < 1440) return { value: Math.round(minutes / 60), unit: 'hour' };
  if (minutes < 2520) return { value: 1, unit: 'day' };
  if (minutes < 43_200) return { value: Math.round(minutes / 1440), unit: 'day' };
  if (minutes < 86_400) return { value: Math.max(1, Math.round(minutes / 43_200)), unit: 'month' };
  const months = Math.round(minutes / 43_200);
  if (months < 12) return { value: months, unit: 'month' };
  return { value: Math.max(1, Math.floor(months / 12)), unit: 'year' };
}

function buildText(t: (key: string, params?: Params) => string, language: string) {
  const english = language.toLowerCase().startsWith('en');
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);

  const cardTime = (iso: string | undefined, now = Date.now()): string => {
    if (!iso) return '';
    const at = new Date(iso).getTime();
    if (!Number.isFinite(at)) return '';
    const { value, unit } = distanceBucket(at, now);
    try {
      return new Intl.NumberFormat(language, { style: 'unit', unit, unitDisplay: english ? 'narrow' : 'long' }).format(value);
    } catch {
      return new Intl.NumberFormat(language).format(value);
    }
  };

  const fallbacks = { unknown: t('inboxNative.unknown'), conversation: t('inboxNative.conversation') };

  return { t, language, fmtDate, cardTime, fallbacks };
}

export type InboxText = ReturnType<typeof buildText>;

export function useInboxText(): InboxText {
  const { t, language } = useI18n();
  return useMemo(() => buildText(t, language), [t, language]);
}
