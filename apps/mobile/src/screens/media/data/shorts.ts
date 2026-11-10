/**
 * VTID-05677 — shorts, the native re-implementation of the class-B web paths in
 * `src/hooks/useShorts.ts` and `EditShortVideoModal.tsx`:
 *  - read: `media_videos` where `status = 'published'`, newest first, tag /
 *    category / limit filters, then the authors' `profiles` rows (`useShorts.ts:43-97`);
 *  - like: read `likes_count`, write ±1 (`:258-288`);
 *  - delete: the member's own row, then the video and thumbnail objects of the
 *    `media` bucket (`:219-256`);
 *  - edit: optional thumbnail upload to `media`, then the `media_videos` update
 *    (`EditShortVideoModal.tsx:146-171`).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import type { DeleteShortInput, EditShortInput, FetchShortsParams, QueryResult, Short } from '../../../ports/media';
import { extractStoragePath, readFileBytes } from './storage';

export async function fetchShorts(params: FetchShortsParams): Promise<Short[]> {
  const supabase = getSupabase();
  let query = supabase.from('media_videos').select('*').eq('status', 'published').order('created_at', { ascending: false });
  if (params.tag) query = query.contains('tags', [params.tag]);
  if (params.tags && params.tags.length > 0) query = query.overlaps('tags', params.tags);
  if (params.category) query = query.eq('category', params.category);
  if (params.limit) query = query.limit(params.limit);
  const { data: videos, error } = await query;
  if (error) throw error;
  if (!videos || videos.length === 0) return [];
  const rows = videos as unknown as Short[];
  const userIds = [...new Set(rows.map((v) => v.user_id))].filter(Boolean);
  if (userIds.length === 0) return rows;
  const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p] as const));
  return rows.map((video) => ({ ...video, profiles: profileMap.get(video.user_id) ?? null })) as unknown as Short[];
}

export function useShortsQuery(params: FetchShortsParams): QueryResult<Short[]> {
  const q = useQuery({ queryKey: ['shorts', params], queryFn: () => fetchShorts(params) });
  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: () => void q.refetch() };
}

export function useInvalidateShorts(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['shorts'] });
}

export async function toggleShortLike({ videoId, action }: { videoId: string; action: 'like' | 'unlike' }): Promise<void> {
  const supabase = getSupabase();
  const { data: video, error: readError } = await supabase.from('media_videos').select('likes_count').eq('id', videoId).single();
  if (readError) throw readError;
  if (video) {
    const newCount = action === 'like' ? video.likes_count + 1 : Math.max(0, video.likes_count - 1);
    const { error } = await supabase.from('media_videos').update({ likes_count: newCount }).eq('id', videoId);
    if (error) throw error;
  }
}

export async function deleteShort(video: DeleteShortInput): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error: dbError } = await supabase.from('media_videos').delete().eq('id', video.id).eq('user_id', user.id);
  if (dbError) throw dbError;
  const filesToRemove: string[] = [];
  const videoPath = extractStoragePath(video.src_url, 'media');
  if (videoPath) filesToRemove.push(videoPath);
  if (video.thumbnail_url) {
    const thumbPath = extractStoragePath(video.thumbnail_url, 'media');
    if (thumbPath) filesToRemove.push(thumbPath);
  }
  if (filesToRemove.length > 0) {
    const { error: storageError } = await supabase.storage.from('media').remove(filesToRemove);
    if (storageError) console.error('Storage cleanup error:', storageError);
  }
}

export async function editShort(input: EditShortInput): Promise<void> {
  const supabase = getSupabase();
  let thumbnailUrl = input.thumbnailUrl;
  if (input.thumbnail) {
    const fileName = `${input.userId}/${input.id}-thumb-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, await readFileBytes(input.thumbnail.uri), { cacheControl: '3600', contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(fileName);
    thumbnailUrl = publicUrl;
  }
  const { error: updateError } = await supabase
    .from('media_videos')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      tags: input.tags.length > 0 ? input.tags : null,
      thumbnail_url: thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('user_id', input.userId);
  if (updateError) throw updateError;
}
