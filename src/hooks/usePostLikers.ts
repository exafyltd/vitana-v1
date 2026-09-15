import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FeedPostSource } from './useFeedPostInteractions';

/**
 * Who liked a given feed post/video — powers the "liked by" list opened from
 * CommunityPostCard. Shares the source→table mapping with useFeedPostInteractions
 * but is fetched separately (and lazily, via `enabled`) since the list is only
 * needed once a user actually opens it.
 */

export interface PostLiker {
  user_id: string;
  display_name?: string;
  avatar_url?: string | null;
}

interface SourceTables {
  likes: string;
  fk: string;
}

const TABLES: Record<FeedPostSource, SourceTables> = {
  post: { likes: 'profile_post_likes', fk: 'post_id' },
  media: { likes: 'media_upload_likes', fk: 'upload_id' },
};

export function usePostLikers(source: FeedPostSource, id: string, enabled: boolean) {
  const cfg = TABLES[source];

  return useQuery({
    queryKey: ['post-likers', source, id],
    enabled: enabled && !!id,
    queryFn: async (): Promise<PostLiker[]> => {
      const { data: likes, error } = await supabase
        .from(cfg.likes as any)
        .select('user_id, created_at')
        .eq(cfg.fk, id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (likes || []) as { user_id: string }[];
      if (rows.length === 0) return [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds);
      if (profilesError) {
        console.error('[usePostLikers] Failed to load liker profiles:', profilesError);
      }
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return rows.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          user_id: r.user_id,
          display_name: profile?.display_name || profile?.full_name || undefined,
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    },
  });
}
