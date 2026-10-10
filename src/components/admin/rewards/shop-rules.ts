/**
 * VTID-05036 — rules the admin screen shows, taken from the gateway's own:
 *  - redeem_reward_item looks a ship fee up by country AND currency
 *    (VTID-04982 migration), so a country without a row in a currency is a
 *    country whose members paying in that currency cannot order;
 *  - set_reward_order_status allows only these moves (same migration):
 *    paid → fulfilling | shipped | delivered, fulfilling → shipped | delivered,
 *    shipped → delivered. Cancelled/refunded come only from the gateway's own
 *    expiry/refund paths and are read-only here.
 */
import type { ShopCurrency } from '@/hooks/useRewardShop';
import type { AdminOrderStatus, AdminRewardItem, AdminShippingFee } from '@/hooks/useAdminRewardShop';

export const SHOP_CURRENCIES: ShopCurrency[] = ['EUR', 'USD'];

export interface MissingFee {
  country: string;
  currencies: ShopCurrency[];
}

/** Every country of an active ship item that lacks a fee row in at least one currency. */
export function missingShippingFees(items: AdminRewardItem[], fees: AdminShippingFee[]): MissingFee[] {
  const have = new Set(fees.map((f) => `${f.country}:${f.currency}`));
  const countries = new Set<string>();
  for (const item of items) {
    if (!item.is_active || item.fulfilment !== 'ship') continue;
    for (const c of item.ships_to_countries ?? []) countries.add(c);
  }
  return [...countries]
    .sort()
    .map((country) => ({ country, currencies: SHOP_CURRENCIES.filter((cur) => !have.has(`${country}:${cur}`)) }))
    .filter((m) => m.currencies.length > 0);
}

const NEXT: Record<string, AdminOrderStatus[]> = {
  paid: ['fulfilling', 'shipped', 'delivered'],
  fulfilling: ['shipped', 'delivered'],
  shipped: ['delivered'],
};

/** The statuses an admin may move an order to from `status`; empty = read-only. */
export function nextOrderStatuses(status: string): AdminOrderStatus[] {
  return NEXT[status] ?? [];
}

export const ORDER_FILTER_STATUSES = [
  'awaiting_shipping_payment', 'paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'refunded',
] as const;

/** "6,90" / "6.90" / "7" → 690; anything else → null. */
export function parseFeeCents(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
