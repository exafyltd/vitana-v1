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
 *
 * Comments themselves support one level of threaded replies (`parent_id`) and
 * a per-comment like reaction (`likes_count` / `liked_by_me` via a dedicated
 * comment-likes join table) — the same shape useShortComments already ships
 * for Shorts comments (VTID-03690, mirroring the earlier
 * media_video_comment_replies_likes migration).
 */

export interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  // derived
  liked_by_me: boolean;
  // joined
  display_name?: string;
  avatar_url?: string | null;
}

export type FeedPostSource = 'post' | 'media';

interface SourceTables {
  likes: string;
  comments: string;
  commentLikes: string;
  fk: string;
}

const TABLES: Record<FeedPostSource, SourceTables> = {
  post: {
    likes: 'profile_post_likes',
    comments: 'profile_post_comments',
    commentLikes: 'profile_post_comment_likes',
    fk: 'post_id',
  },
  media: {
    likes: 'media_upload_likes',
    comments: 'media_upload_comments',
    commentLikes: 'media_upload_comment_likes',
    fk: 'upload_id',
  },
};

export function useFeedPostInteractions(source: FeedPostSource, id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cfg = TABLES[source];

  const likeKey = ['feed-post-like', source, id, user?.id];
  const commentsKey = ['feed-post-comments', source, id, user?.id];

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

  // Comments (with author profile joined in a second query). One level of
  // threading via parent_id, plus a per-comment like counter — same shape
  // useShortComments already ships for Shorts (media_video_comments).
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

      let likedSet = new Set<string>();
      if (user) {
        const commentIds = raw.map((c) => c.id);
        const { data: myLikes } = await supabase
          .from(cfg.commentLikes as any)
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        likedSet = new Set((myLikes || []).map((l: any) => l.comment_id));
      }

      return raw.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        parent_id: c.parent_id ?? null,
        likes_count: c.likes_count ?? 0,
        liked_by_me: likedSet.has(c.id),
        display_name: profileMap.get(c.user_id)?.display_name || undefined,
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      })) as FeedComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(cfg.comments as any)
        .insert({ [cfg.fk]: id, user_id: user.id, content, parent_id: parentId ?? null } as any);
      if (error) throw error;
      // The post author (and, for a reply, the parent comment's author) is
      // notified by a DB trigger on the comment table
      // (20260623000000_post_interaction_notifications.sql /
      // 20260820120000_vtid_03690_comment_reactions_replies.sql) — no client call.
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

  const toggleCommentLike = useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        const { error } = await supabase
          .from(cfg.commentLikes as any)
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(cfg.commentLikes as any)
          .insert({ comment_id: commentId, user_id: user.id } as any);
        if (error) throw error;
        // The comment author is notified by a DB trigger on the comment-likes
        // table (20260820120000_vtid_03690_comment_reactions_replies.sql).
      }
    },
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const prev = queryClient.getQueryData<FeedComment[]>(commentsKey);
      queryClient.setQueryData<FeedComment[]>(commentsKey, (old) =>
        (old || []).map((c) =>
          c.id === commentId
            ? { ...c, liked_by_me: !liked, likes_count: Math.max(0, c.likes_count + (liked ? -1 : 1)) }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(commentsKey, context.prev);
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
    toggleCommentLike: toggleCommentLike.mutate,
  };
}
