import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getVitanaIndexTier, type VitanaIndexTier } from "@/lib/vitanaIndex";

export type VitanaPillarKey =
  | "physical"
  | "mental"
  | "nutritional"
  | "social"
  | "environmental"
  | "prosperity";

export interface VitanaIndexPillars {
  physical: number;
  mental: number;
  nutritional: number;
  social: number;
  environmental: number;
  prosperity: number;
}

export interface VitanaIndexScoreRow {
  date: string;
  score_total: number;
  score_physical: number | null;
  score_mental: number | null;
  score_nutritional: number | null;
  score_social: number | null;
  score_environmental: number | null;
  score_prosperity: number | null;
  confidence: number | null;
  model_version: string | null;
}

export interface VitanaIndexState {
  total: number;
  tier: VitanaIndexTier;
  pillars: VitanaIndexPillars;
  history: Array<{ date: string; score: number }>;
  trend: "up" | "down" | "stable";
  confidence: number;
  isBaseline: boolean;
  lastUpdated: string | null;
}

const DEFAULT_PILLARS: VitanaIndexPillars = {
  physical: 100,
  mental: 100,
  nutritional: 100,
  social: 100,
  environmental: 100,
  prosperity: 100,
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
      "date, score_total, score_physical, score_mental, score_nutritional, score_social, score_environmental, score_prosperity, confidence, model_version"
    )
    .gte("date", fromDate)
    .order("date", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as VitanaIndexScoreRow[];
  if (rows.length === 0) return null;

  const today = rows[rows.length - 1];
  const history = rows.map((r) => ({ date: r.date, score: r.score_total }));

  return {
    total: today.score_total,
    tier: getVitanaIndexTier(today.score_total),
    pillars: {
      physical: today.score_physical ?? DEFAULT_PILLARS.physical,
      mental: today.score_mental ?? DEFAULT_PILLARS.mental,
      nutritional: today.score_nutritional ?? DEFAULT_PILLARS.nutritional,
      social: today.score_social ?? DEFAULT_PILLARS.social,
      environmental: today.score_environmental ?? DEFAULT_PILLARS.environmental,
      prosperity: today.score_prosperity ?? DEFAULT_PILLARS.prosperity,
    },
    history,
    trend: deriveTrend(history),
    confidence: today.confidence ?? 0,
    isBaseline: today.model_version?.startsWith("baseline") ?? false,
    lastUpdated: today.date,
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
  const labels: Record<VitanaPillarKey, string> = {
    physical: "Physical",
    mental: "Mental",
    nutritional: "Nutritional",
    social: "Social",
    environmental: "Environmental",
    prosperity: "Prosperity",
  };
  return labels[key];
}

export function pillarKeys(): VitanaPillarKey[] {
  return ["physical", "mental", "nutritional", "social", "environmental", "prosperity"];
}

export function weakestPillar(pillars: VitanaIndexPillars): VitanaPillarKey {
  const keys = pillarKeys();
  return keys.reduce((weakest, key) => (pillars[key] < pillars[weakest] ? key : weakest), keys[0]);
}
