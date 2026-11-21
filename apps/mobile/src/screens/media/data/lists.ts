/**
 * VTID-05677 — the music and podcast lists, the native twin of the two inline
 * `useQuery` calls in `src/pages/community/MediaHub.tsx`:
 *  - music `:337-366` — `media_uploads` + `music_metadata`, `media_type = 'music'`,
 *    approved, public, newest first, limit 10;
 *  - podcasts `:535-551` — `media_uploads` + `podcast_metadata(*)`, same filters.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import type { MusicTrack, PodcastEpisode, QueryResult } from '../../../ports/media';

export async function fetchMusic(): Promise<MusicTrack[]> {
  const { data, error } = await getSupabase()
    .from('media_uploads')
    .select(
      `
          id,
          title,
          description,
          tags,
          file_url,
          duration,
          plays_count,
          created_at,
          music_metadata (
            genre,
            mood,
            artist_name
          )
        `,
    )
    .eq('media_type', 'music')
    .eq('status', 'approved')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as MusicTrack[];
}

export async function fetchPodcasts(): Promise<PodcastEpisode[]> {
  const { data, error } = await getSupabase()
    .from('media_uploads')
    .select('*, podcast_metadata(*)')
    .eq('media_type', 'podcast')
    .eq('status', 'approved')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as PodcastEpisode[];
}

export function useMusicQuery(): QueryResult<MusicTrack[]> {
  const q = useQuery({ queryKey: ['community-music'], queryFn: fetchMusic });
  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: () => void q.refetch() };
}

export function usePodcastsQuery(): QueryResult<PodcastEpisode[]> {
  const q = useQuery({ queryKey: ['community-podcasts'], queryFn: fetchPodcasts });
  return { data: q.data, isLoading: q.isLoading, isError: q.isError, refetch: () => void q.refetch() };
}
