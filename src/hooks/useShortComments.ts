import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface ShortComment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // joined
  display_name?: string;
  avatar_url?: string | null;
}

export function useShortComments(videoId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['short-comments', videoId],
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
      return rawComments.map(c => {
        const p = profileMap.get(c.user_id);
        return {
          ...c,
          display_name: p?.display_name || p?.full_name || undefined,
          avatar_url: p?.avatar_url || null,
        };
      });
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!videoId) throw new Error('Missing video id');
      const { error } = await supabase
        .from('media_video_comments' as any)
        .insert({ video_id: videoId, user_id: user.id, content } as any);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['short-comments', videoId] });
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
      queryClient.invalidateQueries({ queryKey: ['short-comments', videoId] });
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  return {
    comments: commentsQuery.data || [],
    commentsLoading: commentsQuery.isLoading,
    addComment: addComment.mutateAsync,
    isAddingComment: addComment.isPending,
    deleteComment: deleteComment.mutate,
  };
}
