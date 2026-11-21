/**
 * VTID-05677 — the real Media Hub data layer against a recording Supabase client
 * and a fixture gateway: every table, filter, limit, bucket, path and endpoint
 * of the web hooks it mirrors (`useShorts.ts`, `useShortComments.ts`,
 * `useBookmarks.ts`, `useMediaUpload.ts`, `useVideoUpload.ts`,
 * `EditShortVideoModal.tsx`, `MediaHub.tsx` music / podcast queries). No test
 * touches a network or a live system: the client is an in-memory recorder.
 */
import '../helpers/no-network';
import './mocks';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { fetchShorts, toggleShortLike, deleteShort, editShort } from '../../src/screens/media/data/shorts';
import { fetchMusic, fetchPodcasts } from '../../src/screens/media/data/lists';
import { addShortComment, deleteShortComment, fetchShortComments, toggleShortCommentLike } from '../../src/screens/media/data/comments';
import { toggleMusicBookmark } from '../../src/screens/media/data/bookmarks';
import { uploadAudio, uploadVideo, validateVideo, VIDEO_MAX_SIZE } from '../../src/screens/media/data/uploads';
import { extractStoragePath, safeFileName } from '../../src/screens/media/data/storage';

jest.mock('../../src/screens/media/data/storage', () => ({
  ...jest.requireActual('../../src/screens/media/data/storage'),
  readFileBytes: jest.fn(async (uri: string) => new TextEncoder().encode(uri).buffer),
}));

type Step = [string, any[]];
type Op = { table: string; steps: Step[] };
type Handler = (op: Op) => { data: any; error: any };

function makeClient(handlers: Record<string, Handler>, user: { id: string } | null = { id: 'u-1' }) {
  const ops: Op[] = [];
  const storage: Array<{ op: string; bucket: string; args: any[] }> = [];
  const client: any = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
      const op: Op = { table, steps: [] };
      ops.push(op);
      const b: any = new Proxy(
        {},
        {
          get: (_t, name: string) => {
            if (name === 'then') return (res: any, rej: any) => Promise.resolve((handlers[table] ?? (() => ({ data: [], error: null })))(op)).then(res, rej);
            return (...args: any[]) => (op.steps.push([name, args]), b);
          },
        },
      );
      return b;
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, bytes: any, opts: any) => (storage.push({ op: 'upload', bucket, args: [path, opts] }), { data: { path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.org/storage/v1/object/public/${bucket}/${path}` } }),
        remove: async (paths: string[]) => (storage.push({ op: 'remove', bucket, args: [paths] }), { data: [], error: null }),
      }),
    },
  };
  __setSupabaseForTests(client);
  return { ops, storage, steps: (table: string) => ops.filter((o) => o.table === table).map((o) => o.steps) };
}

const has = (steps: Step[], name: string, ...args: any[]) => steps.some(([n, a]) => n === name && JSON.stringify(a) === JSON.stringify(args));
const used = (steps: Step[], name: string) => steps.some(([n]) => n === name);
const lastWrite = (steps: Step[]) => steps.find(([n]) => ['insert', 'update', 'delete'].includes(n));

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('shorts', () => {
  it('reads published shorts newest first with the tag, category and limit filters, then the authors', async () => {
    const sb = makeClient({
      media_videos: () => ({ data: [{ id: 's-1', user_id: 'u-9' }, { id: 's-2', user_id: 'u-9' }], error: null }),
      profiles: () => ({ data: [{ user_id: 'u-9', display_name: 'Mira', full_name: null, avatar_url: null }], error: null }),
    });
    const rows = await fetchShorts({ limit: 100, tag: 'sleep', tags: ['a', 'b'], category: 'General' });
    const [videos] = sb.steps('media_videos');
    expect(videos).toEqual([
      ['select', ['*']],
      ['eq', ['status', 'published']],
      ['order', ['created_at', { ascending: false }]],
      ['contains', ['tags', ['sleep']]],
      ['overlaps', ['tags', ['a', 'b']]],
      ['eq', ['category', 'General']],
      ['limit', [100]],
    ]);
    const [profiles] = sb.steps('profiles');
    expect(profiles).toEqual([['select', ['user_id, display_name, full_name, avatar_url']], ['in', ['user_id', ['u-9']]]]);
    expect(rows.map((r) => r.profiles?.display_name)).toEqual(['Mira', 'Mira']);
  });

  it('returns an empty list without reading profiles, and throws the read error', async () => {
    const sb = makeClient({ media_videos: () => ({ data: [], error: null }) });
    expect(await fetchShorts({})).toEqual([]);
    expect(sb.steps('profiles')).toEqual([]);
    makeClient({ media_videos: () => ({ data: null, error: new Error('read failed') }) });
    await expect(fetchShorts({})).rejects.toThrow('read failed');
  });

  it('like writes the count ±1 (never below zero)', async () => {
    const sb = makeClient({ media_videos: (op) => (used(op.steps, 'update') ? { data: null, error: null } : { data: { likes_count: 0 }, error: null }) });
    await toggleShortLike({ videoId: 's-1', action: 'like' });
    await toggleShortLike({ videoId: 's-1', action: 'unlike' });
    const [read1, write1, , write2] = sb.steps('media_videos');
    expect(read1).toEqual([['select', ['likes_count']], ['eq', ['id', 's-1']], ['single', []]]);
    expect(lastWrite(write1)).toEqual(['update', [{ likes_count: 1 }]]);
    expect(lastWrite(write2)).toEqual(['update', [{ likes_count: 0 }]]);
  });

  it('delete removes the member own row, then the video and thumbnail objects', async () => {
    const sb = makeClient({ media_videos: () => ({ data: null, error: null }) });
    await deleteShort({ id: 's-1', src_url: 'https://cdn.example.org/storage/v1/object/public/media/shorts/u-1/a.mp4', thumbnail_url: 'https://cdn.example.org/storage/v1/object/public/media/shorts/u-1/a.jpg' });
    expect(sb.steps('media_videos')[0]).toEqual([['delete', []], ['eq', ['id', 's-1']], ['eq', ['user_id', 'u-1']]]);
    expect(sb.storage).toEqual([{ op: 'remove', bucket: 'media', args: [['shorts/u-1/a.mp4', 'shorts/u-1/a.jpg']] }]);
  });

  it('delete needs a signed-in member and stops on a database error', async () => {
    makeClient({}, null);
    await expect(deleteShort({ id: 's', src_url: 'x' })).rejects.toThrow('User not authenticated');
    const sb = makeClient({ media_videos: () => ({ data: null, error: new Error('rls') }) });
    await expect(deleteShort({ id: 's', src_url: 'x' })).rejects.toThrow('rls');
    expect(sb.storage).toEqual([]);
  });

  it('edit uploads a new thumbnail as <user>/<id>-thumb-<ts>.jpg and updates the row of the owner', async () => {
    const sb = makeClient({ media_videos: () => ({ data: null, error: null }) });
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    await editShort({ id: 's-1', userId: 'u-1', title: '  New  ', description: '   ', tags: [], thumbnailUrl: 'old', thumbnail: { uri: 'file:///t.png', name: 't.png', mimeType: 'image/png', size: 1 } });
    expect(sb.storage[0]).toEqual({ op: 'upload', bucket: 'media', args: ['u-1/s-1-thumb-1700000000000.jpg', { cacheControl: '3600', contentType: 'image/jpeg', upsert: false }] });
    const [steps] = sb.steps('media_videos');
    const update = lastWrite(steps)![1][0];
    expect(update).toMatchObject({ title: 'New', description: null, tags: null, thumbnail_url: 'https://cdn.example.org/storage/v1/object/public/media/u-1/s-1-thumb-1700000000000.jpg' });
    expect(typeof update.updated_at).toBe('string');
    expect(steps.slice(-2)).toEqual([['eq', ['id', 's-1']], ['eq', ['user_id', 'u-1']]]);
    jest.restoreAllMocks();
  });

  it('edit keeps the current thumbnail when none is picked', async () => {
    const sb = makeClient({ media_videos: () => ({ data: null, error: null }) });
    await editShort({ id: 's-1', userId: 'u-1', title: 'T', description: 'D', tags: ['a'], thumbnailUrl: 'keep' });
    expect(sb.storage).toEqual([]);
    expect(lastWrite(sb.steps('media_videos')[0])![1][0]).toMatchObject({ title: 'T', description: 'D', tags: ['a'], thumbnail_url: 'keep' });
  });
});

describe('music and podcasts', () => {
  it('music: approved public tracks, newest first, 10, with the music metadata', async () => {
    const sb = makeClient({ media_uploads: () => ({ data: [{ id: 't' }], error: null }) });
    expect(await fetchMusic()).toEqual([{ id: 't' }]);
    const [steps] = sb.steps('media_uploads');
    expect(String(steps[0][1][0])).toContain('music_metadata');
    expect(steps.slice(1)).toEqual([['eq', ['media_type', 'music']], ['eq', ['status', 'approved']], ['eq', ['is_public', true]], ['order', ['created_at', { ascending: false }]], ['limit', [10]]]);
  });

  it('podcasts: approved public episodes with podcast_metadata(*), newest first, 10', async () => {
    const sb = makeClient({ media_uploads: () => ({ data: null, error: null }) });
    expect(await fetchPodcasts()).toEqual([]);
    expect(sb.steps('media_uploads')[0]).toEqual([['select', ['*, podcast_metadata(*)']], ['eq', ['media_type', 'podcast']], ['eq', ['status', 'approved']], ['eq', ['is_public', true]], ['order', ['created_at', { ascending: false }]], ['limit', [10]]]);
  });

  it('a read error throws', async () => {
    makeClient({ media_uploads: () => ({ data: null, error: new Error('x') }) });
    await expect(fetchMusic()).rejects.toThrow('x');
    await expect(fetchPodcasts()).rejects.toThrow('x');
  });
});

describe('comments', () => {
  it('reads the video comments oldest first with authors and the member likes', async () => {
    const sb = makeClient({
      media_video_comments: () => ({ data: [{ id: 'c-1', user_id: 'u-2', parent_id: undefined, content: 'hi', likes_count: undefined, created_at: 'x', video_id: 's-1' }], error: null }),
      profiles: () => ({ data: [{ user_id: 'u-2', display_name: null, full_name: 'Max Full', avatar_url: 'a.png' }], error: null }),
      media_video_comment_likes: () => ({ data: [{ comment_id: 'c-1' }], error: null }),
    });
    const rows = await fetchShortComments('s-1', 'u-1');
    expect(sb.steps('media_video_comments')[0]).toEqual([['select', ['*']], ['eq', ['video_id', 's-1']], ['order', ['created_at', { ascending: true }]]]);
    expect(sb.steps('media_video_comment_likes')[0]).toEqual([['select', ['comment_id']], ['eq', ['user_id', 'u-1']], ['in', ['comment_id', ['c-1']]]]);
    expect(rows[0]).toMatchObject({ parent_id: null, likes_count: 0, liked_by_me: true, display_name: 'Max Full', avatar_url: 'a.png' });
  });

  it('skips the likes read without a member and the profile read without comments', async () => {
    const sb = makeClient({ media_video_comments: () => ({ data: [], error: null }) });
    expect(await fetchShortComments('s-1', undefined)).toEqual([]);
    expect(sb.steps('profiles')).toEqual([]);
    expect(sb.steps('media_video_comment_likes')).toEqual([]);
  });

  it('add, delete and like / unlike write the web rows', async () => {
    const sb = makeClient({ media_video_comments: () => ({ data: null, error: null }), media_video_comment_likes: () => ({ data: null, error: null }) });
    await addShortComment({ videoId: 's-1', content: 'yo', parentId: 'c-1' });
    await deleteShortComment('c-1');
    await toggleShortCommentLike({ commentId: 'c-2', liked: false });
    await toggleShortCommentLike({ commentId: 'c-2', liked: true });
    const [add, del] = sb.steps('media_video_comments');
    expect(lastWrite(add)).toEqual(['insert', [{ video_id: 's-1', user_id: 'u-1', content: 'yo', parent_id: 'c-1' }]]);
    expect(del).toEqual([['delete', []], ['eq', ['id', 'c-1']]]);
    const [like, unlike] = sb.steps('media_video_comment_likes');
    expect(lastWrite(like)).toEqual(['insert', [{ comment_id: 'c-2', user_id: 'u-1' }]]);
    expect(unlike).toEqual([['delete', []], ['eq', ['comment_id', 'c-2']], ['eq', ['user_id', 'u-1']]]);
  });

  it('adding needs a signed-in member', async () => {
    makeClient({}, null);
    await expect(addShortComment({ videoId: 's', content: 'x', parentId: null })).rejects.toThrow('Not authenticated');
  });
});

describe('bookmarks', () => {
  const item = { item_type: 'music' as const, item_id: 't-1', item_name: 'Calm', item_metadata: { artist: 'A' } };
  it('adds a bookmark when absent', async () => {
    const sb = makeClient({ bookmarked_items: (op) => (used(op.steps, 'insert') ? { data: null, error: null } : { data: [], error: null }) });
    expect(await toggleMusicBookmark(item)).toBe(true);
    expect(lastWrite(sb.steps('bookmarked_items')[1])).toEqual(['insert', [{ user_id: 'u-1', item_type: 'music', item_id: 't-1', item_name: 'Calm', item_image_url: undefined, item_metadata: { artist: 'A' } }]]);
  });
  it('removes it when present', async () => {
    const sb = makeClient({ bookmarked_items: (op) => (used(op.steps, 'delete') ? { data: null, error: null } : { data: [{ id: 'b' }], error: null }) });
    expect(await toggleMusicBookmark(item)).toBe(true);
    expect(sb.steps('bookmarked_items')[1]).toEqual([['delete', []], ['eq', ['user_id', 'u-1']], ['eq', ['item_type', 'music']], ['eq', ['item_id', 't-1']]]);
  });
  it('a unique violation (already bookmarked) is not an error; other errors throw; no member does nothing', async () => {
    makeClient({ bookmarked_items: (op) => (used(op.steps, 'insert') ? { data: null, error: { code: '23505' } } : { data: [], error: null }) });
    expect(await toggleMusicBookmark(item)).toBe(false);
    makeClient({ bookmarked_items: (op) => (used(op.steps, 'insert') ? { data: null, error: new Error('x') } : { data: [], error: null }) });
    await expect(toggleMusicBookmark(item)).rejects.toThrow('x');
    makeClient({}, null);
    expect(await toggleMusicBookmark(item)).toBe(false);
  });
});

describe('uploads', () => {
  const audio = (over: any = {}) => ({ file: { uri: 'file:///a.mp3', name: 'My song (1).mp3', mimeType: 'audio/mpeg', size: 1000 }, mediaType: 'music' as const, title: 'T', description: 'D', tags: ['sleep'], visibility: 'public' as const, genre: 'Jazz', mood: 'Calm', ...over });

  it('music: media-uploads bucket, <user>/<ts>_<safe name>, pending row, then music_metadata', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const sb = makeClient({
      media_uploads: () => ({ data: { id: 'm-1' }, error: null }),
      music_metadata: () => ({ data: null, error: null }),
    });
    await uploadAudio(audio());
    expect(sb.storage[0]).toEqual({ op: 'upload', bucket: 'media-uploads', args: ['u-1/1700000000000_My_song__1_.mp3', { contentType: 'audio/mpeg', cacheControl: '3600', upsert: false }] });
    expect(lastWrite(sb.steps('media_uploads')[0])![1][0]).toMatchObject({ user_id: 'u-1', title: 'T', media_type: 'music', file_path: 'u-1/1700000000000_My_song__1_.mp3', file_size: 1000, status: 'pending', is_public: true, tags: ['sleep'] });
    expect(lastWrite(sb.steps('music_metadata')[0])).toEqual(['insert', [{ media_id: 'm-1', genre: 'Jazz', mood: 'Calm' }]]);
    jest.restoreAllMocks();
  });

  it('private audio is not public; a podcast splits host and guests', async () => {
    const sb = makeClient({ media_uploads: () => ({ data: { id: 'm-2' }, error: null }), podcast_metadata: () => ({ data: null, error: null }) });
    await uploadAudio(audio({ mediaType: 'podcast', visibility: 'private', hostGuest: 'Hanna, Max, Eva', language: 'German' }));
    expect(lastWrite(sb.steps('media_uploads')[0])![1][0]).toMatchObject({ media_type: 'podcast', is_public: false });
    expect(lastWrite(sb.steps('podcast_metadata')[0])).toEqual(['insert', [{ media_id: 'm-2', host_name: 'Hanna', guest_name: 'Max, Eva', language: 'German' }]]);
  });

  it('a metadata failure deletes the upload row and throws', async () => {
    const sb = makeClient({ media_uploads: (op) => (used(op.steps, 'delete') ? { data: null, error: null } : { data: { id: 'm-3' }, error: null }), music_metadata: () => ({ data: null, error: new Error('x') }) });
    await expect(uploadAudio(audio())).rejects.toThrow('Failed to save music metadata');
    expect(sb.steps('media_uploads').some((s) => has(s, 'delete') && has(s, 'eq', 'id', 'm-3'))).toBe(true);
  });

  it('audio over the limit never reaches storage', async () => {
    const sb = makeClient({});
    await expect(uploadAudio(audio({ file: { uri: 'x', name: 'a.mp3', mimeType: 'audio/mpeg', size: 51 * 1024 * 1024 } }))).rejects.toThrow('50MB');
    await expect(uploadAudio(audio({ mediaType: 'podcast', file: { uri: 'x', name: 'a.mp3', mimeType: 'audio/mpeg', size: 101 * 1024 * 1024 } }))).rejects.toThrow('100MB');
    expect(sb.storage).toEqual([]);
  });

  const video = (over: any = {}) => ({ file: { uri: 'file:///v.mp4', name: 'v.mp4', mimeType: 'video/mp4', size: 5000 }, title: 'V', description: 'D', tags: ['sleep'], category: 'General', language: 'English', durationSec: 30, ...over });

  it('video: media bucket under shorts/<user>/, published row, no custom thumbnail → gateway extract-thumbnail', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const sb = makeClient({ media_videos: () => ({ data: { id: 'v-1' }, error: null }) });
    const calls: Array<{ path: string; init: any }> = [];
    __setGatewayForTests((async (path: string, init: any) => (calls.push({ path, init }), { ok: true, status: 200 })) as never);
    const onReady = jest.fn();
    await uploadVideo(video(), onReady);
    expect(sb.storage[0]).toEqual({ op: 'upload', bucket: 'media', args: ['shorts/u-1/1700000000000_v.mp4', { cacheControl: '3600', contentType: 'video/mp4', upsert: false }] });
    expect(lastWrite(sb.steps('media_videos')[0])![1][0]).toMatchObject({ user_id: 'u-1', title: 'V', src_url: 'https://cdn.example.org/storage/v1/object/public/media/shorts/u-1/1700000000000_v.mp4', thumbnail_url: null, duration_sec: 30, status: 'published', category: 'General' });
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe('/media-hub/shorts/extract-thumbnail');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body)).toEqual({ video_id: 'v-1', video_path: 'shorts/u-1/1700000000000_v.mp4' });
    await new Promise((r) => setTimeout(r, 0));
    expect(onReady).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('video with a custom thumbnail uploads it and skips the gateway', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const sb = makeClient({ media_videos: () => ({ data: { id: 'v-2' }, error: null }) });
    const gw = jest.fn();
    __setGatewayForTests(gw as never);
    await uploadVideo(video({ thumbnail: { uri: 'file:///t.png', name: 't.png', mimeType: 'image/png', size: 1 } }));
    expect(sb.storage[1]).toEqual({ op: 'upload', bucket: 'media', args: ['shorts/u-1/1700000000000_thumb.png', { cacheControl: '3600', contentType: 'image/png', upsert: false }] });
    expect(lastWrite(sb.steps('media_videos')[0])![1][0].thumbnail_url).toContain('shorts/u-1/1700000000000_thumb.png');
    expect(gw).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('a failed extract-thumbnail call is best effort', async () => {
    makeClient({ media_videos: () => ({ data: { id: 'v-3' }, error: null }) });
    __setGatewayForTests((async () => {
      throw new Error('offline');
    }) as never);
    const onReady = jest.fn();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(uploadVideo(video(), onReady)).resolves.toBeUndefined();
    await new Promise((r) => setTimeout(r, 0));
    expect(onReady).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('validates type, size and duration like web', () => {
    expect(validateVideo({ mimeType: 'video/mp4', size: 1 }, 300)).toEqual({ valid: true });
    expect(validateVideo({ mimeType: 'video/webm', size: 1 })).toEqual({ valid: true });
    expect(validateVideo({ mimeType: 'video/quicktime', size: 1 })).toEqual({ valid: true });
    expect(validateVideo({ mimeType: 'video/x-msvideo', size: 1 })).toEqual({ valid: false, reason: 'type' });
    expect(validateVideo({ mimeType: 'video/mp4', size: VIDEO_MAX_SIZE + 1 })).toEqual({ valid: false, reason: 'size' });
    expect(validateVideo({ mimeType: 'video/mp4', size: 1 }, 301)).toEqual({ valid: false, reason: 'duration' });
  });

  it('an invalid video never reaches storage', async () => {
    const sb = makeClient({});
    await expect(uploadVideo(video({ file: { uri: 'x', name: 'a.avi', mimeType: 'video/x-msvideo', size: 1 } }))).rejects.toThrow('Invalid video');
    expect(sb.storage).toEqual([]);
  });
});

describe('storage helpers', () => {
  it('extracts the object path of a public url', () => {
    expect(extractStoragePath('https://x/storage/v1/object/public/media/shorts/u/a.mp4', 'media')).toBe('shorts/u/a.mp4');
    expect(extractStoragePath('https://x/other/a.mp4', 'media')).toBeNull();
    expect(safeFileName('a b(1).mp4')).toBe('a_b_1_.mp4');
  });
});
