import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface ProfilePost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfilePosts(userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const postsQuery = useQuery({
    queryKey: ['profile-posts', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('profile_posts' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProfilePost[];
    },
    enabled: !!targetUserId,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl, videoUrl, isPublic }: { content: string; imageUrl?: string; videoUrl?: string; isPublic?: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profile_posts' as any)
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
          // Defaults to public to preserve prior behaviour; the composer maps its
          // visibility control (public/friends/groups) onto this flag.
          ...(isPublic === undefined ? {} : { is_public: isPublic }),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProfilePost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-posts', targetUserId] });
      // Launch-phase News feed shows the author's own posts too — refresh it
      // immediately so a new post appears without waiting for realtime/poll.
      queryClient.invalidateQueries({ queryKey: ['all-news-feed'] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('profile_posts' as any)
        .delete()
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-posts', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['all-news-feed'] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
    createPost,
    deletePost,
  };
}
