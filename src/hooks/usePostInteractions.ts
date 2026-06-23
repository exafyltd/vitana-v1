import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // joined
  display_name?: string;
  avatar_url?: string;
}

export function usePostInteractions(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user liked
  const likeQuery = useQuery({
    queryKey: ['post-like', postId, user?.id],
    enabled: !!user && !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_post_likes' as any)
        .select('id')
        .eq('post_id', postId)
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
          .from('profile_post_likes' as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_post_likes' as any)
          .insert({ post_id: postId, user_id: user.id } as any);
        if (error) throw error;
        // The post author is notified by a DB trigger on profile_post_likes
        // (20260623000000_post_interaction_notifications.sql) — no client call.
      }
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['post-like', postId, user?.id] });
      const prev = queryClient.getQueryData(['post-like', postId, user?.id]);
      queryClient.setQueryData(['post-like', postId, user?.id], !prev);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['post-like', postId, user?.id], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post-like', postId, user?.id] });
      // Refresh the post to get updated counts
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });

  // Comments
  const commentsQuery = useQuery({
    queryKey: ['post-comments', postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('profile_post_comments' as any)
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rawComments = (comments || []) as unknown as PostComment[];
      if (rawComments.length === 0) return [];

      // Fetch profiles for comment authors
      const userIds = [...new Set(rawComments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return rawComments.map(c => ({
        ...c,
        display_name: profileMap.get(c.user_id)?.display_name || 'Unknown',
        avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profile_post_comments' as any)
        .insert({ post_id: postId, user_id: user.id, content } as any);
      if (error) throw error;
      // The post author is notified by a DB trigger on profile_post_comments
      // (20260623000000_post_interaction_notifications.sql) — no client call.
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('profile_post_comments' as any)
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
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
