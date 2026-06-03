// Money formatting for the gateway commerce wallet rail.
//
// All commerce money in the gateway rail is carried as integer MINOR units
// (cents). This is the single helper that converts those minor units into a
// locale-aware, currency-formatted string. It reads the active locale from the
// i18n singleton (same source as @/lib/locale-format) so EUR/USD amounts render
// correctly in the German-first UI.
//
// Do NOT format money by hand (`(minor/100).toFixed(2) + '€'`) — that bypasses
// locale grouping/decimal rules and the `no-raw-locale-call` lint rule.

import { getI18nLocale } from '@/lib/i18n-toast';

export type GatewayCurrency = 'EUR' | 'USD';

/**
 * Format an integer minor-unit amount (e.g. 1234) in the given currency
 * (e.g. 'EUR') as a locale-aware string (e.g. "12,34 €").
 */
export function formatMoneyMinor(
  amountMinor: number,
  currency: GatewayCurrency,
): string {
  const locale = getI18nLocale() || 'de-DE';
  // i18n-allow-next-line: Intl currency formatting reads the active app locale
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format((amountMinor ?? 0) / 100);
}

/** Convert a major-unit value (e.g. 12.34) to integer minor units (1234). */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

/** Convert integer minor units (1234) back to a major-unit number (12.34). */
export function toMajorUnits(amountMinor: number): number {
  return (amountMinor ?? 0) / 100;
}
