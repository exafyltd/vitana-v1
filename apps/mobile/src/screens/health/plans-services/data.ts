/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the two
 * health reads these screens make, re-implemented natively (the web hooks
 * import the class-B `@/integrations/supabase/client`, plan decision 2) against
 * the injected native Supabase client. Both are RLS-scoped reads of rows the
 * signed-in member can already see; nothing here writes.
 *
 * - `useHealthPlans` — the READ half of the web `useHealthPlans()`
 *   (src/hooks/useHealthPlans.ts:9-20): `user_health_plans` `select('*')`,
 *   `active = true`, newest first, same query key. Its three mutations
 *   (`generatePlan` → the `generate-personalized-plan` edge function,
 *   `updateAdherence` → UPDATE, `logAdherence` → INSERT) are not ported: the
 *   native twin is reads-only (plan decision 3a).
 * - `useVitanaIndexTotal` — the number `<VitanaIndexValue />` shows
 *   (src/components/health/VitanaIndexValue.tsx:10-13, fed by `useVitanaIndex`,
 *   src/hooks/useVitanaIndex.ts:88-145): the trailing 7-day
 *   `vitana_index_scores` window for the member, else the latest-ever row; the
 *   newest row's `score_total`. The web's self-heal step in between
 *   (`rpc('health_compute_vitana_index')`, useVitanaIndex.ts:116-127) upserts a
 *   score row, a health-data write, so the native read skips it and goes
 *   straight to the latest-ever fallback.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';

export type HealthPlanRow = {
  id: string;
  plan_type: string;
  adherence_score: number;
  plan_data: unknown;
  last_updated?: string | null;
  is_ai_generated?: boolean | null;
  active?: boolean;
  created_at?: string;
  [key: string]: unknown;
};

/** Web query key (useHealthPlans.ts:10), so a later native writer invalidates the same cache. */
export const HEALTH_PLANS_KEY = ['health-plans'] as const;

export function useHealthPlans() {
  const query = useQuery<HealthPlanRow[]>({
    queryKey: HEALTH_PLANS_KEY,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('user_health_plans')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as HealthPlanRow[];
    },
  });
  return { plans: query.data, isLoading: query.isLoading, refetch: query.refetch };
}

type ScoreRow = { date: string; score_total: number };

const INDEX_COLUMNS = 'date, score_total';

export async function fetchVitanaIndexTotal(userId: string | undefined): Promise<number | null> {
  if (!userId) return null;
  const supabase = getSupabase();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('vitana_index_scores')
    .select(INDEX_COLUMNS)
    .eq('user_id', userId)
    .gte('date', fromDate)
    .order('date', { ascending: true });
  if (error) throw error;
  let rows = (data ?? []) as ScoreRow[];

  if (rows.length === 0) {
    const latest = await supabase.from('vitana_index_scores').select(INDEX_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (latest.error) throw latest.error;
    rows = (latest.data ?? []) as ScoreRow[];
  }
  if (rows.length === 0) return null;
  return rows[rows.length - 1].score_total;
}

/**
 * `{ total, isLoading }` like `useVitanaIndexCache()`. Keyed under the web's
 * `['vitana_index']` prefix, so the diary's invalidation after a write
 * (src/screens/diary/data/entries.ts VITANA_INDEX_KEY) refreshes it too.
 */
export function useVitanaIndexTotal() {
  const query = useQuery<number | null>({
    queryKey: ['vitana_index', 'current', 'total'],
    queryFn: async () => {
      const { data } = await getSupabase().auth.getUser();
      return fetchVitanaIndexTotal(data.user?.id);
    },
    staleTime: 60_000,
  });
  return { total: query.data ?? null, isLoading: query.isLoading };
}
