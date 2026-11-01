/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — native twins of the read
 * side of the web `useRewardRules` (src/hooks/useRewardRules.ts) and
 * `useRewardShop` / `useRewardOrders` (src/hooks/useRewardShop.ts), plus the
 * pure helpers of src/components/wallet/EarnMore.tsx (`EARN_ACTION_ROUTES`,
 * `stillEarnable`, `nextGoal`) and `itemText`. Same gateway GETs, same
 * per-member query keys, same `enabled: !loading && !!userId` and stale times.
 *
 * Re-implemented, not imported from `@vitana/core`: the web hooks import
 * `@/lib/community-gateway` and `@/context/AuthProvider` and EarnMore.tsx
 * imports react-router (class B), so none of these files can enter core (R4).
 *
 * Read only. The web `redeemRewardItem` (POST /api/v1/rewards/shop/redeem) is
 * NOT carried over: the shop's confirm goes to `RewardShopActions`
 * (./actions.ts), which makes no call (owner instruction for VTID-05424).
 */
import { useQuery } from '@tanstack/react-query';
import { gatewayGet } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';

export type RewardRuleGroup = 'first_steps' | 'habits' | 'community';

export interface RewardOverviewRule {
  id: string;
  amount: number;
  once: boolean;
  cap: { count: number; days: number } | null;
  /** VTID-04878: calendar window (UTC) of a capped rule; null = rolling `cap.days`. */
  window?: 'day' | 'week' | null;
  earned: boolean;
  used_in_window: number | null;
}

export interface RewardOverview {
  ok: true;
  unit: 'VTNA';
  eur_per_vtna: number;
  earned_balance: number;
  groups: Array<{ group: RewardRuleGroup; rules: RewardOverviewRule[] }>;
  never_earns: string[];
  recent: Array<{ rule_id: string | null; amount: number; created_at: string }>;
}

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

export type RewardOrderStatus = 'awaiting_shipping_payment' | 'paid' | 'fulfilling' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

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

/** Per member: the responses carry this member's balance, never reused across accounts. */
export const rewardRulesQueryKey = (userId: string | null) => ['wallet', 'reward-rules', userId ?? 'anonymous'] as const;
export const rewardShopQueryKey = (userId: string | null) => ['wallet', 'reward-shop', userId ?? 'anonymous'] as const;
export const rewardOrdersQueryKey = (userId: string | null) => ['wallet', 'reward-orders', userId ?? 'anonymous'] as const;

/** The item's text in the UI language, else German (always present), else English, else the fallback. */
export function itemText(map: Record<string, string> | undefined, locale: string, fallback: string): string {
  const lc = (locale || '').slice(0, 2).toLowerCase();
  return (map && (map[lc] || map.de || map.en)) || fallback;
}

type OkBody = { ok?: boolean; error?: string };

async function getOk<T extends OkBody>(path: string): Promise<T> {
  const json = await gatewayGet<T | null>(path);
  if (!json?.ok) throw new Error(json?.error || 'load_failed');
  return json;
}

export const fetchRewardRules = () => getOk<RewardOverview>('/api/v1/wallet/reward-rules');
export const fetchRewardShop = () => getOk<RewardShop>('/api/v1/rewards/shop');
export async function fetchRewardOrders(): Promise<RewardOrder[]> {
  const json = await getOk<{ ok: true; orders?: RewardOrder[] }>('/api/v1/rewards/orders');
  return json.orders ?? [];
}

function useMemberQuery<T>(key: (userId: string | null) => readonly unknown[], fn: () => Promise<T>, staleTime: number) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({ queryKey: key(userId), queryFn: fn, enabled: !loading && !!userId, staleTime });
}

export const useRewardRules = () => useMemberQuery(rewardRulesQueryKey, fetchRewardRules, 60_000);
export const useRewardShop = () => useMemberQuery(rewardShopQueryKey, fetchRewardShop, 30_000);
export const useRewardOrders = () => useMemberQuery(rewardOrdersQueryKey, fetchRewardOrders, 30_000);

/** Where each rewarded action happens (web EarnMore.tsx). A rule that is not listed gets no button. */
export const EARN_ACTION_ROUTES: Record<string, string> = {
  profile_complete: '/me/profile',
  first_diary: '/daily-diary',
  diary_streak_3: '/daily-diary',
  diary_streak_7: '/daily-diary',
  diary_streak_30: '/daily-diary',
  first_group: '/comm/groups',
  first_event_rsvp: '/comm/events-meetups',
  first_connection: '/comm/members',
  five_connections: '/comm/members',
  first_match_accepted: '/me/matches',
  first_health_check: '/health/vitana-index',
  index_new_best: '/health/vitana-index',
  invite_friend_joined: '/invite',
  invited_friends_10: '/invite',
  autopilot_action_done: '/autopilot',
  live_room_15min: '/comm/live-rooms',
};

/** Not something the member can start from here. */
const SKIPPED_RULES = new Set(['onboarding_complete']);
const MAX_ACTIONS = 5;
const GROUP_ORDER: Record<string, number> = { first_steps: 0, habits: 1, community: 2 };

/** Rules that can still pay in their current window, highest reward first (web EarnMore.tsx). */
export function stillEarnable(overview: RewardOverview): RewardOverviewRule[] {
  const rows: Array<{ rule: RewardOverviewRule; group: number }> = [];
  for (const g of overview.groups) {
    for (const rule of g.rules) {
      if (SKIPPED_RULES.has(rule.id)) continue;
      if (rule.once && rule.earned) continue;
      if (rule.cap && (rule.used_in_window ?? 0) >= rule.cap.count) continue;
      rows.push({ rule, group: GROUP_ORDER[g.group] ?? 9 });
    }
  }
  rows.sort((a, b) => b.rule.amount - a.rule.amount || a.group - b.group);
  return rows.slice(0, MAX_ACTIONS).map((r) => r.rule);
}

/** The most valuable item the member can already afford, else the cheapest open one to save for (web EarnMore.tsx). */
export function nextGoal(
  items: RewardShopItem[],
  balance: number,
): { kind: 'save'; item: RewardShopItem; missing: number } | { kind: 'redeem'; item: RewardShopItem } | null {
  const open = items.filter((i) => i.available);
  if (open.length === 0) return null;
  const affordable = open.filter((i) => i.vtna_price <= balance).sort((a, b) => b.vtna_price - a.vtna_price);
  if (affordable.length > 0) return { kind: 'redeem', item: affordable[0] };
  const cheapest = [...open].sort((a, b) => a.vtna_price - b.vtna_price)[0];
  return { kind: 'save', item: cheapest, missing: cheapest.vtna_price - balance };
}

/** The cap line key of a capped rule (VTID-04878: calendar day / week, else rolling days). */
export function capKey(rule: RewardOverviewRule): string {
  if (rule.window === 'day') return 'wallet.rewardRules.capToday';
  if (rule.window === 'week') return 'wallet.rewardRules.capWeek';
  return 'wallet.rewardRules.cap';
}
