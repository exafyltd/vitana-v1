/**
 * Regression tests for "I like a post, refresh, and my like is gone" — the
 * News feed report behind VTID-03503.
 *
 * Nothing was lost server-side: the like and comment rows were committed and
 * the DB triggers had the parent's counts exactly right. What the viewer saw
 * on reload was the CACHED feed row. `all-news-feed` holds likes_count /
 * comments_count for 5 minutes AND is mirrored into localStorage, and no part
 * of the like/comment path ever told it anything had changed — so the restored
 * snapshot re-rendered the counts from before her own tap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const persistNowMock = vi.fn();
vi.mock('@/lib/query-persist', () => ({
  persistQueryCacheNow: () => persistNowMock(),
}));

// Captures every .on(event, filter, handler) registration made against the
// shared "all-news-feed-live" channel, keyed by "<event>:<table>", so the
// realtime wiring tests below can fire a fabricated payload straight at the
// same handler the real channel would invoke.
const channelHandlers = new Map<string, (payload: unknown) => void>();
const channelMock = {
  on: vi.fn(
    (_type: string, filter: { event: string; table: string }, handler: (payload: unknown) => void) => {
      channelHandlers.set(`${filter.event}:${filter.table}`, handler);
      return channelMock;
    },
  ),
  subscribe: vi.fn(() => channelMock),
};

// The module pulls in the supabase client and the gateway config at import
// time; neither is exercised by applyFeedEngagementDelta.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));

import {
  applyFeedEngagementDelta,
  allNewsFeedKey,
  rowChangedBeyondCounts,
  useFeedRealtimeRefresh,
} from '@/hooks/useAllNewsFeed';

function post(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-p1',
    kind: 'post',
    source: 'post',
    post_id: 'p1',
    user_id: 'author',
    likes_count: 4,
    comments_count: 2,
    published_at: '2026-08-05T11:00:00Z',
    ...overrides,
  };
}

function seed(qc: QueryClient, posts: unknown[]) {
  qc.setQueryData(allNewsFeedKey('viewer', 'de'), {
    posts,
    performer: null,
    featureAnnouncements: [],
  });
}

const readPosts = (qc: QueryClient) =>
  (qc.getQueryData(allNewsFeedKey('viewer', 'de')) as { posts: Record<string, unknown>[] }).posts;

describe('applyFeedEngagementDelta', () => {
  let qc: QueryClient;

  beforeEach(() => {
    persistNowMock.mockClear();
    qc = new QueryClient();
  });

  it('carries a like into the cached count, so a reload does not show the pre-tap value', () => {
    seed(qc, [post()]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 });

    expect(readPosts(qc)[0].likes_count).toBe(5);
    expect(readPosts(qc)[0].comments_count).toBe(2);
  });

  it('carries a comment into the cached count', () => {
    seed(qc, [post()]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', comments: 1 });

    expect(readPosts(qc)[0].comments_count).toBe(3);
  });

  it('applies unlike / comment-delete as a negative delta', () => {
    seed(qc, [post()]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: -1 });
    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', comments: -1 });

    expect(readPosts(qc)[0]).toMatchObject({ likes_count: 3, comments_count: 1 });
  });

  it('never renders a negative count', () => {
    seed(qc, [post({ likes_count: 0, comments_count: 0 })]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: -1, comments: -1 });

    expect(readPosts(qc)[0]).toMatchObject({ likes_count: 0, comments_count: 0 });
  });

  it('distinguishes a profile post from a community video with the same id', () => {
    // 'post' and 'media' items live in different tables and their ids are
    // independent — a collision must not move the wrong card's count.
    seed(qc, [
      post({ id: 'post-x', source: 'post', post_id: 'x', likes_count: 1 }),
      post({ id: 'media-x', source: 'media', post_id: 'x', likes_count: 7 }),
    ]);

    applyFeedEngagementDelta(qc, { source: 'media', postId: 'x', likes: 1 });

    expect(readPosts(qc)[0].likes_count).toBe(1);
    expect(readPosts(qc)[1].likes_count).toBe(8);
  });

  it('leaves other posts untouched by identity, so only the one card re-renders', () => {
    const other = post({ id: 'post-p2', post_id: 'p2' });
    seed(qc, [post(), other]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 });

    expect(readPosts(qc)[1]).toBe(other);
  });

  it('patches every cached language/viewer variant of the feed', () => {
    qc.setQueryData(allNewsFeedKey('viewer', 'de'), { posts: [post()], performer: null, featureAnnouncements: [] });
    qc.setQueryData(allNewsFeedKey('viewer', 'en'), { posts: [post()], performer: null, featureAnnouncements: [] });

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 });

    for (const lang of ['de', 'en']) {
      const data = qc.getQueryData(allNewsFeedKey('viewer', lang)) as { posts: Record<string, unknown>[] };
      expect(data.posts[0].likes_count).toBe(5);
    }
  });

  it('flushes the localStorage mirror immediately', () => {
    // The periodic writer runs every 30s. "As soon as she refreshes" lands
    // inside that window, which is precisely when the bug was reported.
    seed(qc, [post()]);

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 });

    expect(persistNowMock).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the feed has not been loaded', () => {
    expect(() =>
      applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 }),
    ).not.toThrow();
  });

  it('does not disturb the rest of the cached payload', () => {
    qc.setQueryData(allNewsFeedKey('viewer', 'de'), {
      posts: [post()],
      performer: { id: 'perf-1' },
      featureAnnouncements: [{ id: 'fa-1' }],
    });

    applyFeedEngagementDelta(qc, { source: 'post', postId: 'p1', likes: 1 });

    const data = qc.getQueryData(allNewsFeedKey('viewer', 'de')) as {
      performer: unknown;
      featureAnnouncements: unknown[];
    };
    expect(data.performer).toEqual({ id: 'perf-1' });
    expect(data.featureAnnouncements).toEqual([{ id: 'fa-1' }]);
  });
});

describe('rowChangedBeyondCounts', () => {
  it('is true for a brand new row (no old row to diff against)', () => {
    expect(rowChangedBeyondCounts(null, { id: 'p1', likes_count: 1 })).toBe(true);
  });

  it('is false when only likes_count / comments_count / updated_at moved', () => {
    const oldRow = { id: 'p1', likes_count: 4, comments_count: 2, updated_at: 't0', status: 'active' };
    const newRow = { id: 'p1', likes_count: 5, comments_count: 3, updated_at: 't1', status: 'active' };
    expect(rowChangedBeyondCounts(oldRow, newRow)).toBe(false);
  });

  it('is true when a non-count field changes, e.g. moderation status', () => {
    const oldRow = { id: 'p1', likes_count: 4, comments_count: 2, moderation_status: 'active' };
    const newRow = { id: 'p1', likes_count: 4, comments_count: 2, moderation_status: 'hidden' };
    expect(rowChangedBeyondCounts(oldRow, newRow)).toBe(true);
  });
});

describe('useFeedRealtimeRefresh — realtime UPDATE wiring (news feed counter bug)', () => {
  // Reproduces the reported bug: another viewer likes/comments on a post, the
  // sync_post_likes_count / sync_post_comments_count triggers UPDATE the
  // parent profile_posts row, and every OTHER open feed must reflect the new
  // count without waiting out the 5-minute cache staleTime.
  let qc: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;
  const wrapper = ({ children }: { children: ReactNode }) =>
    QueryClientProvider({ client: qc, children });

  beforeEach(() => {
    channelHandlers.clear();
    channelMock.on.mockClear();
    channelMock.subscribe.mockClear();
    qc = new QueryClient();
    invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  });

  function seed(posts: unknown[]) {
    qc.setQueryData(allNewsFeedKey('viewer', 'de'), { posts, performer: null, featureAnnouncements: [] });
  }
  const readPosts = () =>
    (qc.getQueryData(allNewsFeedKey('viewer', 'de')) as { posts: Record<string, unknown>[] }).posts;

  it('subscribes to UPDATE on profile_posts, not just INSERT', () => {
    renderHook(() => useFeedRealtimeRefresh(true), { wrapper });

    expect(channelHandlers.has('INSERT:profile_posts')).toBe(true);
    expect(channelHandlers.has('UPDATE:profile_posts')).toBe(true);
  });

  it('patches the like count in place when another viewer likes a post — no refetch', () => {
    seed([post({ post_id: 'p1', likes_count: 4, comments_count: 2 })]);
    renderHook(() => useFeedRealtimeRefresh(true), { wrapper });

    channelHandlers.get('UPDATE:profile_posts')?.({
      old: { id: 'p1', likes_count: 4, comments_count: 2, updated_at: 't0' },
      new: { id: 'p1', likes_count: 5, comments_count: 2, updated_at: 't1' },
    });

    expect(readPosts()[0]).toMatchObject({ likes_count: 5, comments_count: 2 });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('patches the comment count in place when another viewer comments — the reported bug', () => {
    seed([post({ post_id: 'p1', likes_count: 1, comments_count: 0 })]);
    renderHook(() => useFeedRealtimeRefresh(true), { wrapper });

    channelHandlers.get('UPDATE:profile_posts')?.({
      old: { id: 'p1', likes_count: 1, comments_count: 0, updated_at: 't0' },
      new: { id: 'p1', likes_count: 1, comments_count: 1, updated_at: 't1' },
    });

    expect(readPosts()[0]).toMatchObject({ likes_count: 1, comments_count: 1 });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('falls back to a full refetch when a non-count field changes on the row', () => {
    seed([post({ post_id: 'p1' })]);
    renderHook(() => useFeedRealtimeRefresh(true), { wrapper });

    channelHandlers.get('UPDATE:profile_posts')?.({
      old: { id: 'p1', likes_count: 4, comments_count: 2, moderation_status: 'active' },
      new: { id: 'p1', likes_count: 4, comments_count: 2, moderation_status: 'hidden' },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['all-news-feed'] });
  });

  it('patches the right row by (source, post_id) when a media UPDATE arrives', () => {
    seed([
      post({ id: 'post-x', source: 'post', post_id: 'x', likes_count: 1 }),
      post({ id: 'media-x', source: 'media', post_id: 'x', likes_count: 7, comments_count: 0 }),
    ]);
    renderHook(() => useFeedRealtimeRefresh(true), { wrapper });

    channelHandlers.get('UPDATE:media_uploads')?.({
      old: { id: 'x', likes_count: 7, comments_count: 0 },
      new: { id: 'x', likes_count: 8, comments_count: 0 },
    });

    expect(readPosts()[0].likes_count).toBe(1);
    expect(readPosts()[1].likes_count).toBe(8);
  });
});
