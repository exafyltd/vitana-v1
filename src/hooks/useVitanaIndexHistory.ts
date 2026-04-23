import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VitanaIndexHistoryPoint {
  date: string;
  score: number;
}

export interface VitanaIndexHistoryResult {
  history: VitanaIndexHistoryPoint[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches up to `days` worth of Vitana Index scores for the authenticated user,
 * ordered oldest → newest. Use it to draw the 90-day trajectory on My Journey.
 */
export function useVitanaIndexHistory(days = 90): VitanaIndexHistoryResult {
  const query = useQuery({
    queryKey: ["vitana_index", "history", days],
    queryFn: async (): Promise<VitanaIndexHistoryPoint[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user?.id) return [];
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromDate = from.toISOString().slice(0, 10);

      const { data, error } = await (supabase as any)
        .from("vitana_index_scores")
        .select("date, score_total")
        .gte("date", fromDate)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: { date: string; score_total: number }) => ({
        date: row.date,
        score: Number(row.score_total ?? 0),
      }));
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
