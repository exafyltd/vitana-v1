import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/resolveProfileUserId';

export interface ProfileStatsCountResult {
  postsCount: number;
  mediaCount: number;
  groupsCount: number;
  /** True only on first load when no cached data exists */
  isPending: boolean;
}

export function useProfileStatsCount(userId?: string): ProfileStatsCountResult {
  const validId = isValidUUID(userId) ? userId : undefined;

  const { data, isPending } = useQuery({
    queryKey: ['profile-stats-count', validId],
    queryFn: async () => {
      if (!validId) return { postsCount: 0, mediaCount: 0, groupsCount: 0 };

      const [postsRes, galleryRes, membershipsRes, createdGroupsRes] = await Promise.all([
        supabase
          .from('profile_posts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', validId),
        supabase
          .from('profile_gallery')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', validId),
        supabase
          .from('global_community_group_members' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', validId),
        supabase
          .from('global_community_groups' as any)
          .select('id', { count: 'exact', head: true })
          .eq('created_by', validId)
          .eq('status', 'approved'),
      ]);

      const membershipCount = membershipsRes.count ?? 0;
      const createdCount = createdGroupsRes.count ?? 0;

      return {
        postsCount: postsRes.count ?? 0,
        mediaCount: galleryRes.count ?? 0,
        groupsCount: Math.max(membershipCount, createdCount),
      };
    },
    enabled: !!validId,
    staleTime: 30_000,
  });

  return {
    postsCount: data?.postsCount ?? 0,
    mediaCount: data?.mediaCount ?? 0,
    groupsCount: data?.groupsCount ?? 0,
    isPending: isPending && !data, // true only when no cached data
  };
}
