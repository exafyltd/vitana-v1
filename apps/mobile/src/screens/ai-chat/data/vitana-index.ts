/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the part of
 * the web `useVitanaIndex` (`src/hooks/useVitanaIndex.ts`) the F2 "Vitana
 * Index" strip card reads: the live total, the trailing-week history and the
 * trend. The web hook is class B (it imports `@/integrations/supabase/client`),
 * so the same three reads are re-implemented on the native Supabase client:
 *
 *   1. `vitana_index_scores` for the member, trailing 7 days, oldest first;
 *   2. none → `rpc('health_compute_vitana_index', { p_date, p_model_version })`
 *      (the web's self-heal; user-scoped and idempotent) and read 1 again;
 *   3. still none → the latest-ever row.
 *
 * Same query key as the web (`['vitana_index', 'current']`), same 60 s stale
 * time. Pure helpers (`deriveTrend`, `weeklyChangePct`) mirror the web math.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';

export type IndexTrend = 'up' | 'down' | 'stable';

export interface VitanaIndexSummary {
  total: number;
  history: Array<{ date: string; score: number }>;
  trend: IndexTrend;
}

type ScoreRow = { date: string; score_total: number };
type Result = { data: unknown; error: unknown };

const COLUMNS = 'date, score_total';

export function deriveTrend(history: Array<{ score: number }>): IndexTrend {
  if (history.length < 2) return 'stable';
  const first = history[0].score;
  const last = history[history.length - 1].score;
  if (last > first + 5) return 'up';
  if (last < first - 5) return 'down';
  return 'stable';
}

/** Weekly change as a share of the 0–999 scale (web `VitanaIndexCard.weeklyChangePct`). */
export function weeklyChangePct(history: Array<{ score: number }>): number {
  if (history.length < 2) return 0;
  return Math.round(((history[history.length - 1].score - history[0].score) / 999) * 100);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchVitanaIndex(userId: string | undefined, now: Date = new Date()): Promise<VitanaIndexSummary | null> {
  if (!userId) return null;
  const supabase = getSupabase();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromDate = isoDay(from);

  const trailing = async (): Promise<ScoreRow[]> => {
    const { data, error } = (await supabase
      .from('vitana_index_scores')
      .select(COLUMNS)
      .eq('user_id', userId)
      .gte('date', fromDate)
      .order('date', { ascending: true })) as Result;
    if (error) throw error;
    return (data ?? []) as ScoreRow[];
  };

  let rows = await trailing();
  if (rows.length === 0) {
    try {
      await supabase.rpc('health_compute_vitana_index', { p_date: isoDay(now), p_model_version: 'v3-5pillar' });
      rows = await trailing();
    } catch {
      /* best-effort, like the web: fall through to the latest-ever row */
    }
  }
  if (rows.length === 0) {
    const { data, error } = (await supabase
      .from('vitana_index_scores')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)) as Result;
    if (error) throw error;
    rows = (data ?? []) as ScoreRow[];
  }
  if (rows.length === 0) return null;
  const history = rows.map((r) => ({ date: r.date, score: Number(r.score_total) || 0 }));
  return { total: history[history.length - 1].score, history, trend: deriveTrend(history) };
}

export function useVitanaIndex() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['vitana_index', 'current'],
    queryFn: () => fetchVitanaIndex(user?.id),
    enabled: !!user,
    staleTime: 60_000,
  });
  return { index: query.data ?? null, isLoading: query.isLoading };
}
