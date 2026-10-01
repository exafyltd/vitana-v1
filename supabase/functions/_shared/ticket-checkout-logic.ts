// VTID-04757: pure pricing/validation helpers for event-ticket checkout.
// No Deno or network imports so Vitest can import this file directly.

// Currencies Stripe treats as having no minor unit (amount is NOT multiplied by 100).
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

export const MAX_TICKETS_PER_PURCHASE = 10;
// Stripe's minimum allowed Checkout Session lifetime is 30 minutes.
export const STRIPE_SESSION_MINUTES = 30;
// Slightly longer than the Stripe session so a payment completing at the last
// second still finds its reservation.
export const RESERVATION_MINUTES = 35;

export function toMinorUnits(amount: number, currency: string): number {
  const factor = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100;
  return Math.round(amount * factor);
}

export function validateQuantity(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_TICKETS_PER_PURCHASE) {
    throw new Error(`Quantity must be a whole number between 1 and ${MAX_TICKETS_PER_PURCHASE}`);
  }
  return n;
}

/** Amount (minor units) the buyer will actually pay, mirroring Stripe's percent_off coupon. */
export function payableMinorUnits(
  unitPrice: number,
  currency: string,
  quantity: number,
  discountPercent: number | null | undefined,
): number {
  const total = toMinorUnits(unitPrice, currency) * quantity;
  const pct = Math.min(Math.max(discountPercent ?? 0, 0), 100);
  return Math.round(total * (1 - pct / 100));
}

/** A purchase that needs no card: free ticket type or a 100% discount. */
export function isFreePurchase(payableMinor: number): boolean {
  return payableMinor <= 0;
}
