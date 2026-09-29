/**
 * VTID-04498 — the member's real rank behind the profile "Top X%" badge,
 * from the get_index_standing RPC (exafyltd/vitana-platform, migration
 * 20260924190000).
 *
 * The server decides whether the badge shows (>= 20 members, someone scores
 * lower, top half); this hook only reads its answer and refuses anything it
 * did not vouch for. Never derive a percentage from the score here — see
 * src/lib/vitana-percentile-guard.test.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IndexStanding {
  /** "Top X%", 1–50. Present only when the badge should be shown. */
  topPercent: number;
  cohortSize: number;
}

/** Pure: RPC jsonb → standing to show, or null. Exported for tests. */
export function normalizeIndexStanding(raw: unknown): IndexStanding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.show !== true) return null;
  const top = r.top_percent;
  if (typeof top !== "number" || !Number.isInteger(top) || top < 1 || top > 50) return null;
  const cohort = typeof r.cohort_size === "number" && Number.isFinite(r.cohort_size) ? r.cohort_size : 0;
  return { topPercent: top, cohortSize: cohort };
}

export function useIndexStanding(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["index_standing", userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_index_standing", { p_user_id: userId });
      if (error) throw error;
      return normalizeIndexStanding(data);
    },
  });
}
