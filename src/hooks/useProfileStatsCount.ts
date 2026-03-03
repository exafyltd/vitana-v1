import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileStatsCountResult {
  postsCount: number;
  mediaCount: number;
  groupsCount: number;
  isLoading: boolean;
}

export function useProfileStatsCount(userId?: string): ProfileStatsCountResult {
  const { data, isLoading } = useQuery({
    queryKey: ['profile-stats-count', userId],
    queryFn: async () => {
      if (!userId) return { postsCount: 0, mediaCount: 0, groupsCount: 0 };

      const [postsRes, galleryRes, membershipsRes, createdGroupsRes] = await Promise.all([
        supabase
          .from('profile_posts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('profile_gallery')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('global_community_group_members' as any)
          .select('group_id')
          .eq('user_id', userId),
        supabase
          .from('global_community_groups' as any)
          .select('id')
          .eq('created_by', userId)
          .eq('status', 'approved'),
      ]);

      if (postsRes.error) {
        console.error('[useProfileStatsCount] posts count error:', postsRes.error);
      }

      if (galleryRes.error) {
        console.error('[useProfileStatsCount] media count error:', galleryRes.error);
      }

      if (membershipsRes.error) {
        console.error('[useProfileStatsCount] memberships fetch error:', membershipsRes.error);
      }

      if (createdGroupsRes.error) {
        console.error('[useProfileStatsCount] created groups fetch error:', createdGroupsRes.error);
      }

      const groupIds = new Set<string>();
      const membershipRows = (membershipsRes.data ?? []) as Array<{ group_id: string | null }>;
      const createdRows = (createdGroupsRes.data ?? []) as Array<{ id: string | null }>;

      membershipRows.forEach((row) => {
        if (row.group_id) groupIds.add(row.group_id);
      });

      createdRows.forEach((row) => {
        if (row.id) groupIds.add(row.id);
      });

      return {
        postsCount: postsRes.count ?? 0,
        mediaCount: galleryRes.count ?? 0,
        groupsCount: groupIds.size,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return {
    postsCount: data?.postsCount ?? 0,
    mediaCount: data?.mediaCount ?? 0,
    groupsCount: data?.groupsCount ?? 0,
    isLoading,
  };
}
