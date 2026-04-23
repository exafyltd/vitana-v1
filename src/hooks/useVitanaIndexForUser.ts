import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicVitanaIndex {
  score: number;
  tier: string;
  date: string;
  modelVersion: string;
}

/**
 * Reads another user's top-line Vitana Index via the SECURITY DEFINER RPC
 * `get_public_vitana_index`. Use this on profile cards (Maxina portal,
 * `/u/{handle}`, Profile Preview dialog) that show the real public number.
 *
 * Returns null when the user has no Index row yet (baseline survey not
 * completed), so the caller can hide the badge entirely instead of
 * rendering a fake score.
 */
export function useVitanaIndexForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["vitana_index", "public", userId ?? "none"],
    queryFn: async (): Promise<PublicVitanaIndex | null> => {
      if (!userId) return null;
      const { data, error } = await (supabase as any).rpc(
        "get_public_vitana_index",
        { p_user_id: userId },
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        score: Number(row.score_total),
        tier: String(row.tier_label ?? ""),
        date: String(row.date ?? ""),
        modelVersion: String(row.model_version ?? ""),
      };
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
