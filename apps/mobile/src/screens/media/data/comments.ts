/**
 * VTID-05677 — short comments, the native twin of web `useShortComments.ts`:
 * `media_video_comments` of the video (oldest first) joined client-side with the
 * authors' `profiles` and the member's `media_video_comment_likes`; add / delete
 * a comment; like or unlike a comment.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import type { ShortComment } from '../../../ports/media';

export async function fetchShortComments(videoId: string, userId: string | undefined): Promise<ShortComment[]> {
  const supabase = getSupabase();
  const { data: comments, error } = await supabase.from('media_video_comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true });
  if (error) throw error;
  const raw = (comments ?? []) as unknown as ShortComment[];
  if (raw.length === 0) return [];
  const userIds = [...new Set(raw.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p] as const));
  let likedSet = new Set<string>();
  if (userId) {
    const { data: myLikes } = await supabase
      .from('media_video_comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in(
        'comment_id',
        raw.map((c) => c.id),
      );
    likedSet = new Set((myLikes ?? []).map((l: { comment_id: string }) => l.comment_id));
  }
  return raw.map((c) => {
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
}

export function useShortCommentsQuery(videoId: string | undefined): { comments: ShortComment[]; isLoading: boolean; refetch: () => void } {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['short-comments', videoId, user?.id], enabled: !!videoId, queryFn: () => fetchShortComments(videoId as string, user?.id) });
  return { comments: q.data ?? [], isLoading: q.isLoading, refetch: () => void q.refetch() };
}

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function addShortComment({ videoId, content, parentId }: { videoId: string; content: string; parentId: string | null }): Promise<void> {
  const userId = await currentUserId();
  const { error } = await getSupabase().from('media_video_comments').insert({ video_id: videoId, user_id: userId, content, parent_id: parentId });
  if (error) throw error;
}

export async function deleteShortComment(commentId: string): Promise<void> {
  const { error } = await getSupabase().from('media_video_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function toggleShortCommentLike({ commentId, liked }: { commentId: string; liked: boolean }): Promise<void> {
  const userId = await currentUserId();
  const supabase = getSupabase();
  if (liked) {
    const { error } = await supabase.from('media_video_comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('media_video_comment_likes').insert({ comment_id: commentId, user_id: userId });
    if (error) throw error;
  }
}
