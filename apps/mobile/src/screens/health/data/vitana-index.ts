/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Vitana Index
 * read, re-implemented natively (class-B: the web `src/hooks/useVitanaIndex.ts`
 * runtime-imports the web Supabase client, so it is not core-extracted).
 * Same table, same columns, same `user_id = auth.uid()` scope, same 7-day
 * window and latest-ever fallback, same transform (`fetchVitanaIndex`,
 * useVitanaIndex.ts:88-213) over the native Supabase client and the native
 * auth session. One query key, so every consumer (snapshot, chips, Index
 * sheet, the biology lane) shares ONE react-query subscription, like the web
 * `VitanaIndexProvider` singleton.
 *
 * READS ONLY. The web self-heal step (useVitanaIndex.ts:116-127) calls the
 * `health_compute_vitana_index` RPC, which UPSERTs a score row; the native
 * twin never writes, so it goes straight to the latest-ever fallback
 * (plan "No health data is written").
 */
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { getVitanaIndexTier, type PillarKey, type VitanaIndexTier } from '../../../ports/health';
import { PILLAR_KEYS } from '../text';

export type VitanaPillarKey = PillarKey;
export type VitanaIndexPillars = Record<VitanaPillarKey, number>;

export interface VitanaIndexScoreRow {
  date: string;
  score_total: number;
  score_nutrition: number | null;
  score_hydration: number | null;
  score_exercise: number | null;
  score_sleep: number | null;
  score_mental: number | null;
  confidence: number | null;
  model_version: string | null;
  feature_inputs: Record<string, unknown> | null;
}

export interface VitanaPillarSubscores {
  baseline: number;
  completions: number;
  data: number;
  streak: number;
}

export interface VitanaIndexState {
  total: number;
  tier: VitanaIndexTier;
  pillars: VitanaIndexPillars;
  subscores: Record<VitanaPillarKey, VitanaPillarSubscores> | null;
  balanceFactor: number | null;
  history: Array<{ date: string; score: number }>;
  pillarHistory: Array<{ date: string; pillars: Partial<VitanaIndexPillars> }>;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  isBaseline: boolean;
  lastUpdated: string | null;
}

export const VITANA_INDEX_TABLE = 'vitana_index_scores';
export const INDEX_SELECT_COLUMNS =
  'date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs';
export const VITANA_INDEX_QUERY_KEY = ['vitana_index', 'current'] as const;

const DEFAULT_PILLARS: VitanaIndexPillars = { nutrition: 10, hydration: 10, exercise: 10, sleep: 10, mental: 10 };

function deriveTrend(history: Array<{ date: string; score: number }>): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  const first = history[0].score;
  const last = history[history.length - 1].score;
  if (last > first + 5) return 'up';
  if (last < first - 5) return 'down';
  return 'stable';
}

function normalizeSubscores(raw: Partial<VitanaPillarSubscores> | undefined | null): VitanaPillarSubscores {
  return {
    baseline: Number(raw?.baseline ?? 0),
    completions: Number(raw?.completions ?? 0),
    data: Number(raw?.data ?? 0),
    streak: Number(raw?.streak ?? 0),
  };
}

/** The first day of the trailing 7-day window (today − 6), as `YYYY-MM-DD` (web `fromDate`). */
export function windowStart(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

/** Rows → the Index state the screens render (web fetchVitanaIndex, steps after the queries). */
export function toVitanaIndexState(rows: VitanaIndexScoreRow[]): VitanaIndexState | null {
  if (rows.length === 0) return null;
  const today = rows[rows.length - 1];
  const history = rows.map((r) => ({ date: r.date, score: r.score_total }));
  const pillarHistory = rows.map((r) => {
    const pillars: Partial<VitanaIndexPillars> = {};
    for (const k of PILLAR_KEYS) {
      const v = r[`score_${k}` as const];
      if (v != null) pillars[k] = v;
    }
    return { date: r.date, pillars };
  });
  const fi = (today.feature_inputs ?? {}) as Record<string, unknown>;
  const rawSubscores = fi.subscores as Record<string, Partial<VitanaPillarSubscores>> | undefined;
  const subscores = rawSubscores
    ? (Object.fromEntries(PILLAR_KEYS.map((k) => [k, normalizeSubscores(rawSubscores[k])])) as Record<VitanaPillarKey, VitanaPillarSubscores>)
    : null;
  const balanceFactor = typeof fi.balance_factor === 'number' ? fi.balance_factor : null;
  return {
    total: today.score_total,
    tier: getVitanaIndexTier(today.score_total),
    pillars: Object.fromEntries(PILLAR_KEYS.map((k) => [k, today[`score_${k}` as const] ?? DEFAULT_PILLARS[k]])) as VitanaIndexPillars,
    subscores,
    balanceFactor,
    history,
    pillarHistory,
    trend: deriveTrend(history),
    confidence: today.confidence ?? 0,
    isBaseline: today.model_version?.startsWith('baseline') ?? false,
    lastUpdated: today.date,
  };
}

/** The two RLS-scoped reads (trailing window, then latest-ever). Never a write. */
export async function fetchVitanaIndex(client: SupabaseClient, userId: string | undefined, now: Date = new Date()): Promise<VitanaIndexState | null> {
  if (!userId) return null;
  const { data, error } = await client
    .from(VITANA_INDEX_TABLE)
    .select(INDEX_SELECT_COLUMNS)
    .eq('user_id', userId)
    .gte('date', windowStart(now))
    .order('date', { ascending: true });
  if (error) throw error;
  let rows = (data ?? []) as VitanaIndexScoreRow[];
  if (rows.length === 0) {
    const latest = await client.from(VITANA_INDEX_TABLE).select(INDEX_SELECT_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (latest.error) throw latest.error;
    rows = (latest.data ?? []) as VitanaIndexScoreRow[];
  }
  return toVitanaIndexState(rows);
}

export interface UseVitanaIndexResult {
  index: VitanaIndexState | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** The singleton Index read (web useVitanaIndex + useVitanaIndexCache). */
export function useVitanaIndex(): UseVitanaIndexResult {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: [...VITANA_INDEX_QUERY_KEY, userId ?? null],
    queryFn: () => fetchVitanaIndex(getSupabase(), userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return {
    index: query.data ?? null,
    isLoading: !!userId && query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

/** The pillar with the lowest score (web `weakestPillar`, useVitanaIndex.ts:243-246). */
export function weakestPillar(pillars: VitanaIndexPillars): VitanaPillarKey {
  return PILLAR_KEYS.reduce((weakest, key) => (pillars[key] < pillars[weakest] ? key : weakest), PILLAR_KEYS[0]);
}
