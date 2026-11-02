/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * money and date formats the commerce screens show.
 *
 *  - `formatMoneyMinor` / `toMinorUnits` / `toMajorUnits`: src/lib/format-money.ts.
 *    The web module reads the locale from the web i18n singleton
 *    (`getI18nLocale`, class B), so the native twin takes the UI language
 *    instead (default de-DE, like the web) — same `Intl.NumberFormat`
 *    currency style.
 *  - `formatDate`: the patterns EventTicket formats with
 *    (src/lib/locale-format.ts formatDate, date-fns, class B), mapped onto
 *    Hermes `Intl` in the UI language.
 */
import { useI18n } from '../../i18n/I18nProvider';

export type GatewayCurrency = 'EUR' | 'USD';

export function formatMoneyMinor(amountMinor: number, currency: string, language?: string): string {
  const cur = (currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat(language || 'de-DE', { style: 'currency', currency: cur }).format((amountMinor ?? 0) / 100);
  } catch {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: cur }).format((amountMinor ?? 0) / 100);
  }
}

export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

export function toMajorUnits(amountMinor: number): number {
  return (amountMinor ?? 0) / 100;
}

/** `formatMoneyMinor` in the member's UI language. */
export function useMoney(): (amountMinor: number, currency: string | null | undefined) => string {
  const { language } = useI18n();
  return (amountMinor, currency) => formatMoneyMinor(amountMinor, currency || 'EUR', language);
}

export type DatePattern = 'EEE, MMM d, yyyy' | 'h:mm a' | "EEE, MMM d, yyyy 'at' h:mm a" | 'yyyyMMdd';

const DAY: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function fmt(d: Date, locale: string, o: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale, o).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', o).format(d);
  }
}

export function formatDate(d: Date, pattern: DatePattern, locale: string): string {
  if (pattern === 'yyyyMMdd') return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  if (pattern === 'h:mm a') return fmt(d, locale, TIME);
  if (pattern === 'EEE, MMM d, yyyy') return fmt(d, locale, DAY);
  return `${fmt(d, locale, DAY)} · ${fmt(d, locale, TIME)}`;
}
