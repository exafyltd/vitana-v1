import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { isValidUUID } from "@/lib/resolveProfileUserId";

export interface FollowedProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FollowingFeed {
  followingIds: string[];
  profiles: FollowedProfile[];
}

export function useFollowingFeed() {
  const { user } = useAuth();
  const validViewer = isValidUUID(user?.id) ? user!.id : undefined;

  const query = useQuery<FollowingFeed>({
    queryKey: ["following-feed", validViewer],
    queryFn: async () => {
      if (!validViewer) return { followingIds: [], profiles: [] };

      const { data: rows, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", validViewer);

      if (error) throw error;

      const followingIds = (rows || []).map((r) => r.following_id);
      if (followingIds.length === 0) {
        return { followingIds: [], profiles: [] };
      }

      const { data: profiles, error: pErr } = await supabase
        .from("global_community_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", followingIds);

      if (pErr) throw pErr;

      return {
        followingIds,
        profiles: (profiles || []) as FollowedProfile[],
      };
    },
    enabled: !!validViewer,
    // Align with the global 2min default so a cached Following tab paints
    // instantly on re-navigation instead of refetching every 30s.
    staleTime: 2 * 60 * 1000,
  });

  return {
    followingIds: query.data?.followingIds ?? [],
    profiles: query.data?.profiles ?? [],
    loading: query.isLoading,
    isAuthenticated: !!validViewer,
  };
}
