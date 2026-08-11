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

  /**
   * Delete one of the caller's own posts.
   *
   * VTID-03468 — this used to be `.delete().eq('id', postId)` with no ownership
   * scope and no read-back. Under RLS a delete that matches NOTHING is not an
   * error: PostgREST happily returns 204 with zero rows affected. So every way
   * this could fail to delete — the row belongs to someone else, the id came
   * from a `media_uploads`-backed feed card and doesn't exist in profile_posts
   * at all, the row was already gone — surfaced to the user as a cheerful
   * "post deleted" toast while the post stayed exactly where it was. That is
   * the "I deleted it and it's still there" report.
   *
   * Now: scope to the owner (matching the "Users can delete their own posts"
   * RLS policy exactly, so this narrows nothing a user could legitimately do)
   * and read the deleted ids back, so a zero-row delete fails loudly.
   */
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profile_posts' as never)
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)
        .select('id');
      if (error) throw error;
      if (!data || (data as unknown as { id: string }[]).length === 0) {
        throw new Error('POST_NOT_DELETED');
      }
      return postId;
    },
    onSuccess: (postId) => {
      // Drop the card immediately instead of waiting out the refetch — the feed
      // is cache-first with a 5-minute staleTime, so an invalidate alone can
      // leave a just-deleted post on screen for a noticeable beat.
      queryClient.setQueryData(
        ['profile-posts', targetUserId],
        (old: ProfilePost[] | undefined) => (old || []).filter((p) => p.id !== postId),
      );
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
