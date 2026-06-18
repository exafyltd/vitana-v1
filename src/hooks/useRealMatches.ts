import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RealMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  /** First/primary reason, ready to show in a single line. */
  match_reason: string;
  /** All reasons returned for this match. */
  match_reasons: string[];
  compatibility_score: number;
}

interface DailyMatchRow {
  matched_user_id: string;
  match_score: number;
  match_reasons: unknown;
}

/**
 * Real "people who match you" data, backed by the `daily_matches` table and the
 * `generate-daily-matches` edge function — the same source the full discovery
 * flow (PeopleDiscoveryHero) uses. No mock/demo profiles.
 *
 * Flow: read live (unexpired, un-actioned) matches → if none, generate a fresh
 * batch and re-read → resolve each match to its real profile. Returns `[]` when
 * the community genuinely has no matches yet, so callers can show an empty state.
 */
export function useRealMatches(limit = 6) {
  return useQuery<RealMatch[]>({
    queryKey: ["real-matches", limit],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const fetchMatches = async (): Promise<DailyMatchRow[]> => {
        const { data } = await supabase
          .from("daily_matches")
          .select("matched_user_id, match_score, match_reasons")
          .eq("user_id", user.id)
          .gt("expires_at", new Date().toISOString())
          .is("action", null)
          .order("match_score", { ascending: false })
          .limit(limit);
        return (data as DailyMatchRow[] | null) ?? [];
      };

      let matches = await fetchMatches();

      // No live matches — ask the backend to generate a fresh batch, then re-read.
      if (matches.length === 0) {
        try {
          await supabase.functions.invoke("generate-daily-matches");
        } catch {
          // ignore — we simply return no matches below
        }
        matches = await fetchMatches();
      }

      if (matches.length === 0) return [];

      // Resolve each match to its real profile (RPC respects profile RLS).
      const profiles = await Promise.all(
        matches.map(async (m) => {
          const { data } = await supabase.rpc("get_user_profile_by_identifier", {
            identifier: m.matched_user_id,
          });
          return data?.[0];
        }),
      );

      return matches
        // Drop matches whose profile can't be resolved by
        // get_user_profile_by_identifier (e.g. the member is not publicly
        // visible). Tapping such a card opens /u/<id>, which runs the SAME
        // RPC and would render "Benutzer nicht gefunden" — so never show a
        // card we can't open.
        .map((m, idx) => ({ m, profile: profiles[idx] }))
        .filter(({ profile }) => Boolean(profile))
        .map(({ m, profile }) => {
          const reasons = Array.isArray(m.match_reasons)
            ? (m.match_reasons as unknown[]).filter(
                (r): r is string => typeof r === "string",
              )
            : [];
          return {
            user_id: m.matched_user_id,
            display_name:
              profile?.display_name || profile?.full_name || "Community Member",
            avatar_url: profile?.avatar_url ?? null,
            bio: profile?.bio ?? null,
            location: profile?.location ?? null,
            match_reason: reasons[0] ?? "",
            match_reasons: reasons,
            compatibility_score: Math.round(Number(m.match_score) || 0),
          };
        });
    },
  });
}
