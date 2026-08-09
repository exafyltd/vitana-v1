/**
 * Looks up community members to offer as @mention suggestions while composing a
 * post. Searches visible profiles in `global_community_profiles` by display name
 * — the same public, RLS-safe source the ContactPicker draws from — and is
 * debounced by react-query's keying + staleTime so each keystroke is cheap.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MentionCandidate {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function useMentionCandidates(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["mention-candidates", q.toLowerCase()],
    queryFn: async (): Promise<MentionCandidate[]> => {
      if (!q) return [];
      const { data, error } = await supabase
        .from("global_community_profiles")
        .select("user_id, display_name, avatar_url")
        .eq("is_visible", true)
        .ilike("display_name", `%${q}%`)
        .limit(6);
      if (error) throw error;
      return ((data || []) as MentionCandidate[]).filter((d) => !!d.display_name);
    },
    enabled: q.length >= 1,
    staleTime: 30_000,
  });
}
