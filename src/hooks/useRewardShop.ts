/**
 * VTID-04983 — Rewards shop data (gateway VTID-04982). Items are priced in
 * earned VTNA; the gateway reads and debits the price, never this app.
 * Titles/descriptions are admin data per locale (DE always present).
 */
import { useQuery } from '@tanstack/react-query';
import { communityFetch } from '@/lib/community-gateway';
import { useAuth } from '@/context/AuthProvider';

export type ShopCurrency = 'EUR' | 'USD';
export type ShopFulfilment = 'ship' | 'event' | 'digital';

export interface RewardShopItem {
  id: string;
  slug: string;
  titles: Record<string, string>;
  descriptions: Record<string, string>;
  images: string[];
  vtna_price: number;
  eur_value: number;
  fulfilment: ShopFulfilment;
  age_restricted: boolean;
  min_age: number | null;
  ships_to_countries: string[];
  available: boolean;
  affordable: boolean;
}

export interface RewardShop {
  ok: true;
  eur_per_vtna: number;
  earned_balance: number;
  items: RewardShopItem[];
  shipping_fees: Array<{ country: string; currency: ShopCurrency; fee_cents: number }>;
}

export type RewardOrderStatus =
  | 'awaiting_shipping_payment' | 'paid' | 'fulfilling' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface RewardOrder {
  id: string;
  item_id: string;
  vtna_amount: number;
  fulfilment: ShopFulfilment;
  status: RewardOrderStatus;
  country: string | null;
  shipping_fee_cents: number | null;
  shipping_currency: ShopCurrency | null;
  created_at: string;
}

export interface RedeemRequest {
  item_id: string;
  idempotency_key: string;
  currency: ShopCurrency;
  locale: string;
  country?: string;
  address?: { name: string; line1: string; line2?: string; postal_code: string; city: string };
  birth_date?: string;
  age_confirmed?: boolean;
}

export type RedeemResponse =
  | { ok: true; order_id: string; status: 'paid' | 'awaiting_shipping_payment'; vtna_amount: number; checkout_url?: string }
  | { ok: false; error: string };

/** Per member: the response carries this member's balance. */
export const rewardShopQueryKey = (userId: string | null) => ['wallet', 'reward-shop', userId ?? 'anonymous'] as const;
export const rewardOrdersQueryKey = (userId: string | null) => ['wallet', 'reward-orders', userId ?? 'anonymous'] as const;

/** The item's text in the UI language, else German (always present), else the slug. */
export function itemText(map: Record<string, string> | undefined, locale: string, fallback: string): string {
  const lc = (locale || '').slice(0, 2).toLowerCase();
  return (map && (map[lc] || map.de || map.en)) || fallback;
}

export async function fetchRewardShop(): Promise<RewardShop> {
  const resp = await communityFetch('/api/v1/rewards/shop');
  const json = await resp.json();
  if (!resp.ok || !json?.ok) throw new Error(json?.error || 'load_failed');
  return json as RewardShop;
}

export async function fetchRewardOrders(): Promise<RewardOrder[]> {
  const resp = await communityFetch('/api/v1/rewards/orders');
  const json = await resp.json();
  if (!resp.ok || !json?.ok) throw new Error(json?.error || 'load_failed');
  return (json.orders ?? []) as RewardOrder[];
}

export async function redeemRewardItem(req: RedeemRequest): Promise<RedeemResponse> {
  const resp = await communityFetch('/api/v1/rewards/shop/redeem', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.ok) return { ok: false, error: String(json?.error || 'REDEEM_FAILED') };
  return json as RedeemResponse;
}

export function useRewardShop() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: rewardShopQueryKey(userId),
    queryFn: fetchRewardShop,
    enabled: !loading && !!userId,
    staleTime: 30_000,
  });
}

export function useRewardOrders() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: rewardOrdersQueryKey(userId),
    queryFn: fetchRewardOrders,
    enabled: !loading && !!userId,
    staleTime: 30_000,
  });
}
