/**
 * Discover marketplace products carry whatever currency their source feed
 * reports (EUR, USD, GBP, ...) — e.g. Amazon.ae rows are seeded 'EUR'
 * ("indicative EUR... display only", per the amazon_ae seed migration) while
 * AliExpress/Admitad rows pass through whatever `currencyId` that feed
 * template returned, often USD. Showing a mix of € and $ on the same screen
 * reads as broken, so every price is converted to EUR for display.
 *
 * These prices are already informational/"indicative" — the amount actually
 * charged happens on the merchant's own site (see checkout-service.ts:
 * affiliate-network products never get wallet-debited). A static,
 * periodically-refreshed rate table is proportionate for that; this is NOT
 * used anywhere transactional (real wallet/checkout amounts use
 * `formatMoneyMinor` in `@/lib/format-money`, untouched by this).
 */

// Units of each currency per 1 EUR. Refresh occasionally; approximate is fine
// for a display-only "indicative price" guide.
const RATE_PER_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  CHF: 0.94,
  CNY: 7.85,
  JPY: 170,
  AED: 3.97,
  AUD: 1.65,
  CAD: 1.47,
};

/** Converts an integer minor-unit amount from `currency` into EUR minor units. */
export function toEurCents(cents: number, currency: string): number {
  const rate = RATE_PER_EUR[currency.toUpperCase()];
  if (!rate) return cents; // unknown currency — show as-is rather than guess
  return Math.round(cents / rate);
}
