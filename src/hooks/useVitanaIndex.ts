import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getVitanaIndexTier, type VitanaIndexTier } from "@/lib/vitanaIndex";
import { lookup } from "@/lib/i18n-toast";

/**
 * The five canonical Vitana pillars. These are the only pillars the Vitana
 * Index is built on — Nutrition, Hydration, Exercise, Sleep, Mental health.
 * Any earlier "physical / social / environmental / prosperity" model was
 * drift and has been erased.
 */
export type VitanaPillarKey =
  | "nutrition"
  | "hydration"
  | "exercise"
  | "sleep"
  | "mental";

export interface VitanaIndexPillars {
  nutrition: number;
  hydration: number;
  exercise: number;
  sleep: number;
  mental: number;
}

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
  feature_inputs: Record<string, any> | null;
}

/** Per-pillar sub-score breakdown (baseline / completions / data / streak),
 *  each 0–40/80 per the v3 compute model. */
export interface VitanaPillarSubscores {
  baseline: number;
  completions: number;
  data: number;
  streak: number;
}

export type VitanaIndexSubscores = Record<VitanaPillarKey, VitanaPillarSubscores>;

export interface VitanaIndexState {
  total: number;
  tier: VitanaIndexTier;
  pillars: VitanaIndexPillars;
  subscores: VitanaIndexSubscores | null;
  balanceFactor: number | null;
  history: Array<{ date: string; score: number }>;
  trend: "up" | "down" | "stable";
  confidence: number;
  isBaseline: boolean;
  lastUpdated: string | null;
}

const DEFAULT_PILLARS: VitanaIndexPillars = {
  nutrition: 10,
  hydration: 10,
  exercise: 10,
  sleep: 10,
  mental: 10,
};

function deriveTrend(history: Array<{ date: string; score: number }>): "up" | "down" | "stable" {
  if (history.length < 2) return "stable";
  const first = history[0].score;
  const last = history[history.length - 1].score;
  if (last > first + 5) return "up";
  if (last < first - 5) return "down";
  return "stable";
}

async function fetchVitanaIndex(userId: string | undefined): Promise<VitanaIndexState | null> {
  if (!userId) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await (supabase as any)
    .from("vitana_index_scores")
    .select(
      "date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs"
    )
    .gte("date", fromDate)
    .order("date", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as VitanaIndexScoreRow[];
  if (rows.length === 0) return null;

  const today = rows[rows.length - 1];
  const history = rows.map((r) => ({ date: r.date, score: r.score_total }));

  const rawSubscores = today.feature_inputs?.subscores as
    | Record<string, Partial<VitanaPillarSubscores>>
    | undefined;
  const subscores: VitanaIndexSubscores | null = rawSubscores
    ? {
        nutrition: normalizeSubscores(rawSubscores.nutrition),
        hydration: normalizeSubscores(rawSubscores.hydration),
        exercise:  normalizeSubscores(rawSubscores.exercise),
        sleep:     normalizeSubscores(rawSubscores.sleep),
        mental:    normalizeSubscores(rawSubscores.mental),
      }
    : null;
  const balanceFactor =
    typeof today.feature_inputs?.balance_factor === "number"
      ? (today.feature_inputs.balance_factor as number)
      : null;

  return {
    total: today.score_total,
    tier: getVitanaIndexTier(today.score_total),
    pillars: {
      nutrition: today.score_nutrition ?? DEFAULT_PILLARS.nutrition,
      hydration: today.score_hydration ?? DEFAULT_PILLARS.hydration,
      exercise:  today.score_exercise  ?? DEFAULT_PILLARS.exercise,
      sleep:     today.score_sleep     ?? DEFAULT_PILLARS.sleep,
      mental:    today.score_mental    ?? DEFAULT_PILLARS.mental,
    },
    subscores,
    balanceFactor,
    history,
    trend: deriveTrend(history),
    confidence: today.confidence ?? 0,
    isBaseline: today.model_version?.startsWith("baseline") ?? false,
    lastUpdated: today.date,
  };
}

function normalizeSubscores(raw: Partial<VitanaPillarSubscores> | undefined | null): VitanaPillarSubscores {
  return {
    baseline:    Number(raw?.baseline    ?? 0),
    completions: Number(raw?.completions ?? 0),
    data:        Number(raw?.data        ?? 0),
    streak:      Number(raw?.streak      ?? 0),
  };
}

export interface UseVitanaIndexResult {
  index: VitanaIndexState | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useVitanaIndex(): UseVitanaIndexResult {
  const query = useQuery({
    queryKey: ["vitana_index", "current"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return fetchVitanaIndex(data.user?.id);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    index: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error) ?? null,
    refetch: () => query.refetch(),
  };
}

export function pillarLabel(key: VitanaPillarKey): string {
  return lookup(`vitanaIndex.${key}`);
}

export function pillarKeys(): VitanaPillarKey[] {
  return ["nutrition", "hydration", "exercise", "sleep", "mental"];
}

export function weakestPillar(pillars: VitanaIndexPillars): VitanaPillarKey {
  const keys = pillarKeys();
  return keys.reduce((weakest, key) => (pillars[key] < pillars[weakest] ? key : weakest), keys[0]);
}
