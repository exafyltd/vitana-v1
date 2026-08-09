import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import type { PostMention } from '@/lib/news-feed-ranker';

export interface ProfilePost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  /** Coloured-background preset id for text-only posts (null = plain card). */
  background_style: string | null;
  /** Members tagged via inline @mentions. */
  mentions: PostMention[];
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
        .from('profile_posts' as never)
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProfilePost[];
    },
    enabled: !!targetUserId,
  });

  const createPost = useMutation({
    mutationFn: async ({ content, imageUrl, videoUrl, isPublic, backgroundStyle, mentions }: { content: string; imageUrl?: string; videoUrl?: string; isPublic?: boolean; backgroundStyle?: string | null; mentions?: PostMention[] }) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Bare insert (no `.select().single()` read-back) with a client-generated
      // id doubling as an idempotency key. Even a minimal-response insert is
      // still one HTTP request/response — if the connection drops after the
      // server commits but before the response reaches the client, we still
      // see an error here despite the post being live. Rather than surface a
      // false "something went wrong" toast (or let a naive retry create a
      // duplicate), reconcile: check whether our own row actually landed
      // before treating the request as failed.
      const id = crypto.randomUUID();
      const { error } = await supabase
        .from('profile_posts' as never)
        .insert({
          id,
          user_id: user.id,
          content,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
          // Coloured backgrounds only apply to text-only posts; the composer
          // passes null once media is attached.
          background_style: backgroundStyle ?? null,
          mentions: mentions ?? [],
          // Defaults to public to preserve prior behaviour; the composer maps its
          // visibility control (public/friends/groups) onto this flag.
          ...(isPublic === undefined ? {} : { is_public: isPublic }),
        } as never);
      if (error) {
        const { data: existing } = await supabase
          .from('profile_posts' as never)
          .select('id')
          .eq('id', id)
          .maybeSingle();
        if (!existing) throw error;
        // Row landed despite the transport error — treat as success.
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-posts', targetUserId] });
      // Launch-phase News feed shows the author's own posts too — refresh it
      // immediately so a new post appears without waiting for realtime/poll.
      queryClient.invalidateQueries({ queryKey: ['all-news-feed'] });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profile_posts' as never)
        // RLS "owner can update own posts" gates this server-side; the
        // moderation-status protect trigger keeps authors from un-hiding.
        .update({ content } as never)
        .eq('id', postId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-posts', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['all-news-feed'] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('profile_posts' as never)
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
    updatePost,
    deletePost,
  };
}
