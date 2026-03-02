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

      const [postsRes, galleryRes, groupsRes] = await Promise.all([
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
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      return {
        postsCount: postsRes.count ?? 0,
        mediaCount: galleryRes.count ?? 0,
        groupsCount: groupsRes.count ?? 0,
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
