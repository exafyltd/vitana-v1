import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  author_name?: string;
  author_avatar?: string;
}

export interface GroupPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

export function useGroupPosts(groupId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_posts')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Enrich with author profiles
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data || []).map(post => ({
        ...post,
        author_name: profileMap.get(post.user_id)?.display_name || 'Unknown',
        author_avatar: profileMap.get(post.user_id)?.avatar_url || undefined,
      })) as GroupPost[];
    },
    enabled: !!groupId,
    staleTime: 15_000,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      if (!user?.id || !groupId) throw new Error('Not authenticated or no group');
      const { data, error } = await supabase
        .from('group_posts')
        .insert({ group_id: groupId, user_id: user.id, content, image_url: imageUrl || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('group_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Check if already liked
      const { data: existing } = await supabase
        .from('group_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('group_post_likes').delete().eq('id', existing.id);
        return { liked: false };
      } else {
        await supabase.from('group_post_likes').insert({ post_id: postId, user_id: user.id });
        return { liked: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    createPost,
    deletePost,
    toggleLike,
  };
}

export function useGroupPostComments(postId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['group-post-comments', postId],
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from('group_post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data || []).map(c => ({
        ...c,
        author_name: profileMap.get(c.user_id)?.display_name || 'Unknown',
        author_avatar: profileMap.get(c.user_id)?.avatar_url || undefined,
      })) as GroupPostComment[];
    },
    enabled: !!postId,
    staleTime: 10_000,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !postId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('group_post_comments')
        .insert({ post_id: postId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-post-comments', postId] });
      // Also refresh posts to update comments_count
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('group_post_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    },
  });

  return {
    comments: commentsQuery.data || [],
    isLoading: commentsQuery.isLoading,
    addComment,
    deleteComment,
  };
}
