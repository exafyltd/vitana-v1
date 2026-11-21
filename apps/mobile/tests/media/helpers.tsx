/**
 * VTID-05677 — test harness for the Media Hub. The screen reads and writes only
 * through `MediaHubData`, so tests hand it a fake built on fixtures; every write
 * (like, bookmark, comment, delete, edit, upload) is recorded on the fake and
 * never reaches a live system. The wrapper adds the shell providers (Query,
 * Theme, Auth double with member `u-1`, Tenant, Language) and the fixture
 * gateway for the enrichment strip.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { MediaHubDataProvider, type MediaHubData, type MusicTrack, type PodcastEpisode, type Short, type ShortComment } from '../../src/ports/media';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper, type GatewayRoutes } from '../helpers/providers';

export const USER = 'u-1';

export const short = (over: Partial<Short> = {}): Short =>
  ({
    id: 's-1',
    user_id: USER,
    title: 'Sunrise run',
    description: 'A morning run',
    tags: ['fitness', 'sleep'],
    category: 'General',
    language: 'English',
    src_url: 'https://cdn.example.org/storage/v1/object/public/media/shorts/u-1/s1.mp4',
    thumbnail_url: 'https://cdn.example.org/storage/v1/object/public/media/shorts/u-1/s1.jpg',
    captions_url: null,
    duration_sec: 42,
    width: null,
    height: null,
    views_count: 10,
    likes_count: 5,
    shares_count: 0,
    comments_count: 2,
    status: 'published',
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
    profiles: { display_name: 'Mira', full_name: null, avatar_url: null },
    ...over,
  }) as Short;

export const SHORTS: Short[] = [short(), short({ id: 's-2', user_id: 'u-2', title: 'Tea ritual', likes_count: 9, comments_count: 0, profiles: { display_name: ' ', full_name: null, avatar_url: null }, tags: [] })];

export const TRACKS: MusicTrack[] = [
  { id: 't-1', title: 'Calm Waves', file_url: 'https://cdn.example.org/t1.mp3', duration: 185, tags: ['calm'], music_metadata: [{ artist_name: 'Aria', genre: 'Ambient', mood: 'Calm' }] },
  { id: 't-2', title: 'Nameless', file_url: 'https://cdn.example.org/t2.mp3', duration: 60, music_metadata: [] },
];

export const EPISODES: PodcastEpisode[] = [
  { id: 'p-1', title: 'Sleep better', file_url: 'https://cdn.example.org/p1.mp3', duration: 1800, created_at: '2026-10-01T10:00:00Z', podcast_metadata: [{ host_name: 'Host Hanna' }] },
  { id: 'p-2', title: 'No host', file_url: 'https://cdn.example.org/p2.mp3', duration: 0, podcast_metadata: null },
];

export const COMMENTS: ShortComment[] = [
  { id: 'c-1', video_id: 's-1', user_id: USER, parent_id: null, content: 'Great run', likes_count: 1, created_at: '2026-11-02T08:00:00Z', liked_by_me: false, display_name: 'Mira', avatar_url: null },
  { id: 'c-2', video_id: 's-1', user_id: 'u-3', parent_id: 'c-1', content: 'Thanks!', likes_count: 0, created_at: '2026-11-02T09:00:00Z', liked_by_me: true, display_name: undefined, avatar_url: null },
];

export type FakeOpts = {
  shorts?: Short[] | 'loading' | 'error';
  music?: MusicTrack[] | 'error';
  podcasts?: EpisodeList;
  comments?: ShortComment[];
  bookmarked?: string[];
  failWith?: Partial<Record<'deleteShort' | 'editShort' | 'uploadVideo' | 'uploadAudio' | 'addComment', true>>;
};
type EpisodeList = PodcastEpisode[] | 'error';

export function makeFake(opts: FakeOpts = {}) {
  const calls: Record<string, any[]> = {};
  const rec = (name: string, arg: any) => (calls[name] ??= []).push(arg);
  const refetch = { shorts: jest.fn(), music: jest.fn(), podcasts: jest.fn(), comments: jest.fn() };
  const bookmarked = new Set(opts.bookmarked ?? []);
  const result = <T,>(v: T[] | 'loading' | 'error' | undefined, fallback: T[], rf: jest.Mock) => ({
    data: v === 'loading' || v === 'error' ? undefined : (v ?? fallback),
    isLoading: v === 'loading',
    isError: v === 'error',
    refetch: rf,
  });
  const fail = (key: keyof NonNullable<FakeOpts['failWith']>) => (opts.failWith?.[key] ? Promise.reject(new Error('boom')) : Promise.resolve());
  const data: MediaHubData = {
    useShorts: (params) => {
      rec('useShorts', params);
      return result(opts.shorts, SHORTS, refetch.shorts);
    },
    useMusic: () => result(opts.music, TRACKS, refetch.music),
    usePodcasts: () => result(opts.podcasts, EPISODES, refetch.podcasts),
    useBookmarks: () => ({ isBookmarked: (_t, id) => bookmarked.has(id) }),
    useShortComments: (videoId) => ({ comments: videoId ? (opts.comments ?? COMMENTS) : [], isLoading: false, refetch: refetch.comments }),
    toggleLike: async (i) => void rec('toggleLike', i),
    toggleBookmark: async (i) => {
      rec('toggleBookmark', i);
      return true;
    },
    addComment: async (i) => {
      rec('addComment', i);
      await fail('addComment');
    },
    deleteComment: async (i) => void rec('deleteComment', i),
    toggleCommentLike: async (i) => void rec('toggleCommentLike', i),
    deleteShort: async (i) => {
      rec('deleteShort', i);
      await fail('deleteShort');
    },
    editShort: async (i) => {
      rec('editShort', i);
      await fail('editShort');
    },
    uploadVideo: async (i) => {
      rec('uploadVideo', i);
      await fail('uploadVideo');
    },
    uploadAudio: async (i) => {
      rec('uploadAudio', i);
      await fail('uploadAudio');
    },
  };
  return { data, calls, refetch };
}

/** Wrapper with the shell providers (signed in as `u-1`) and the fake `MediaHubData`. */
export function mediaWrapper(fake: ReturnType<typeof makeFake>, opts: { gateway?: GatewayRoutes; language?: string } = {}) {
  const client = createSupabaseDouble({ session: fakeSession(USER) }).client;
  const Shell = makeWrapper({ client, gateway: opts.gateway ?? {}, language: opts.language ?? 'en-US' });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Shell>
        <MediaHubDataProvider value={fake.data}>{children}</MediaHubDataProvider>
      </Shell>
    );
  };
}
