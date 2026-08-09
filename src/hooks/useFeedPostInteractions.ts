import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { applyFeedEngagementDelta } from '@/hooks/useAllNewsFeed';

/**
 * Unified inline like + comment for the News / Community feed.
 *
 * The feed mixes two post sources with parallel (but separate) backends:
 *   - 'post'  → profile_posts   → profile_post_likes / profile_post_comments
 *   - 'media' → media_uploads   → media_upload_likes / media_upload_comments
 *
 * Both pairs share the same shape (per-user like row + comment row keyed by a
 * foreign-key column), and both keep the parent's likes_count / comments_count
 * in sync via DB triggers, so this hook just parametrises the table + FK names.
 * Mirrors usePostInteractions (which covers the 'post' case on the profile).
 */

export interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  // joined
  display_name?: string;
  avatar_url?: string | null;
}

export type FeedPostSource = 'post' | 'media';

interface SourceTables {
  likes: string;
  comments: string;
  fk: string;
}

const TABLES: Record<FeedPostSource, SourceTables> = {
  post: { likes: 'profile_post_likes', comments: 'profile_post_comments', fk: 'post_id' },
  media: { likes: 'media_upload_likes', comments: 'media_upload_comments', fk: 'upload_id' },
};

export function useFeedPostInteractions(source: FeedPostSource, id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cfg = TABLES[source];

  const likeKey = ['feed-post-like', source, id, user?.id];
  const commentsKey = ['feed-post-comments', source, id];

  // Has the current user liked this post?
  const likeQuery = useQuery({
    queryKey: likeKey,
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(cfg.likes as any)
        .select('id')
        .eq(cfg.fk, id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const isLiked = likeQuery.data;
      if (isLiked) {
        const { error } = await supabase
          .from(cfg.likes as any)
          .delete()
          .eq(cfg.fk, id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(cfg.likes as any)
          .insert({ [cfg.fk]: id, user_id: user.id } as any);
        if (error) throw error;
        // The post author is notified by a DB trigger on the like table
        // (20260623000000_post_interaction_notifications.sql) — no client call.
      }
      // The DB trigger has now updated the parent's likes_count. Carry the same
      // delta into the cached feed row so a refresh doesn't restore the count
      // from before this tap (VTID-03503).
      applyFeedEngagementDelta(queryClient, { source, postId: id, likes: isLiked ? -1 : 1 });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: likeKey });
      const prev = queryClient.getQueryData(likeKey);
      queryClient.setQueryData(likeKey, !prev);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(likeKey, context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: likeKey });
    },
  });

  // Comments (with author profile joined in a second query).
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    enabled: !!id,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from(cfg.comments as any)
        .select('*')
        .eq(cfg.fk, id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const raw = (comments || []) as any[];
      if (raw.length === 0) return [] as FeedComment[];

      const userIds = [...new Set(raw.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return raw.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        display_name: profileMap.get(c.user_id)?.display_name || undefined,
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      })) as FeedComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(cfg.comments as any)
        .insert({ [cfg.fk]: id, user_id: user.id, content } as any);
      if (error) throw error;
      // The post author is notified by a DB trigger on the comment table
      // (20260623000000_post_interaction_notifications.sql) — no client call.
      applyFeedEngagementDelta(queryClient, { source, postId: id, comments: 1 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from(cfg.comments as any)
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      applyFeedEngagementDelta(queryClient, { source, postId: id, comments: -1 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });

  return {
    isLiked: likeQuery.data ?? false,
    toggleLike: toggleLike.mutate,
    isTogglingLike: toggleLike.isPending,
    comments: commentsQuery.data || [],
    commentsLoading: commentsQuery.isLoading,
    addComment: addComment.mutateAsync,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
  };
}
