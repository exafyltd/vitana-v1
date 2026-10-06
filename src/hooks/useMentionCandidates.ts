/**
 * Looks up community members to offer as @mention suggestions (posts and post
 * comments; group chat filters its own roster instead).
 *
 * VTID-04926: goes through the `search_mention_candidates` database function,
 * never the profiles table directly. The function escapes ILIKE wildcards,
 * leaves out the caller, test and service accounts (`notification_test_actors`,
 * `service_bot_accounts`) and only returns members who share a tenant with the
 * caller. If the call fails there is deliberately no fallback query — the
 * picker just shows "no people found".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentionCandidate {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useMentionCandidates(query: string, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["mention-candidates", q.toLowerCase()],
    queryFn: async (): Promise<MentionCandidate[]> => {
      if (!q) return [];
      // The function is newer than the generated types. `get: true` — it is a
      // read-only (STABLE) function, so it goes out as a GET like any other read.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "search_mention_candidates",
        { p_query: q, p_limit: 8 },
        { get: true },
      );
      if (error) {
        console.warn("[mentions] search_mention_candidates failed", error);
        return [];
      }
      return ((data || []) as MentionCandidate[]).filter((d) => !!d.display_name);
    },
    enabled: enabled && q.length >= 1,
    staleTime: 30_000,
  });
}
