/**
 * VTID-04864 — the VTNA reward rules and this member's progress, from the
 * gateway's one rule table (GET /api/v1/wallet/reward-rules). Labels are
 * rendered from the app catalog (wallet.rewardRules.*) keyed by rule id.
 */
import { useQuery } from '@tanstack/react-query';
import { communityFetch } from '@/lib/community-gateway';

export type RewardRuleGroup = 'first_steps' | 'habits' | 'community';

export interface RewardOverviewRule {
  id: string;
  amount: number;
  once: boolean;
  cap: { count: number; days: number } | null;
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

export const REWARD_RULES_QUERY_KEY = ['wallet', 'reward-rules'] as const;

export async function fetchRewardRules(): Promise<RewardOverview> {
  const resp = await communityFetch('/api/v1/wallet/reward-rules');
  const json = await resp.json();
  if (!resp.ok || !json?.ok) throw new Error(json?.error || 'load_failed');
  return json as RewardOverview;
}

export function useRewardRules() {
  return useQuery({
    queryKey: REWARD_RULES_QUERY_KEY,
    queryFn: fetchRewardRules,
    staleTime: 60_000,
  });
}
