import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface ShortComment {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  // derived
  liked_by_me: boolean;
  // joined
  display_name?: string;
  avatar_url?: string | null;
}

export function useShortComments(videoId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['short-comments', videoId, user?.id];

  const commentsQuery = useQuery({
    queryKey,
    enabled: !!videoId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('media_video_comments' as any)
        .select('*')
        .eq('video_id', videoId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rawComments = (comments || []) as unknown as ShortComment[];
      if (rawComments.length === 0) return [];

      const userIds = [...new Set(rawComments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Which of these comments has the current user liked?
      let likedSet = new Set<string>();
      if (user) {
        const commentIds = rawComments.map(c => c.id);
        const { data: myLikes } = await supabase
          .from('media_video_comment_likes' as any)
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        likedSet = new Set((myLikes || []).map((l: any) => l.comment_id));
      }

      return rawComments.map(c => {
        const p = profileMap.get(c.user_id);
        return {
          ...c,
          parent_id: c.parent_id ?? null,
          likes_count: c.likes_count ?? 0,
          liked_by_me: likedSet.has(c.id),
          display_name: p?.display_name || p?.full_name || undefined,
          avatar_url: p?.avatar_url || null,
        };
      });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (!videoId) throw new Error('Missing video id');
      const { error } = await supabase
        .from('media_video_comments' as any)
        .insert({ video_id: videoId, user_id: user.id, content, parent_id: parentId ?? null } as any);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('media_video_comments' as any)
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        const { error } = await supabase
          .from('media_video_comment_likes' as any)
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('media_video_comment_likes' as any)
          .insert({ comment_id: commentId, user_id: user.id } as any);
        if (error) throw error;
      }
    },
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ShortComment[]>(queryKey);
      queryClient.setQueryData<ShortComment[]>(queryKey, (old) =>
        (old || []).map(c =>
          c.id === commentId
            ? { ...c, liked_by_me: !liked, likes_count: Math.max(0, c.likes_count + (liked ? -1 : 1)) }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    comments: commentsQuery.data || [],
    commentsLoading: commentsQuery.isLoading,
    addComment: addComment.mutateAsync,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
    toggleCommentLike: toggleCommentLike.mutate,
  };
}
