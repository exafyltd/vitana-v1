/**
 * useNewsFeed.ts — fetchCommunityNews() swallowed-error bug, six call sites.
 *
 * Every Supabase read feeding the Community tab's assembled news feed
 * (global_community_events, media_uploads, the new-members
 * global_community_profiles lookup, user_follows, profile_posts, and the
 * post-author global_community_profiles lookup) previously destructured
 * only `{ data }` and fed it straight into `if (data) { ...push articles... }`
 * — a real DB error resolved `data` to `undefined`/`null`, which is
 * indistinguishable from "this section legitimately has nothing to show",
 * and silently omitted that section from the feed with no trace in the logs.
 *
 * This is a feed-assembly function that deliberately degrades per-section
 * (a failure in one source should not blank the whole feed), so the fix is
 * log-only: each site now checks its `error` and `console.error`s a
 * distinguishing message, without changing the "skip this section, keep
 * going" behavior.
 *
 * Verified here with a mocked Supabase client (fetchCommunityNews is a
 * plain exported async function, so a behavioral test is possible rather
 * than a source-level check).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));

// Chainable query-builder mock: every method returns `this` so any call
// order/combination the source code uses (.select().gte().order().limit(),
// .select().eq().eq().order().limit(), .select().eq(), .select().in(), etc.)
// resolves to the configured `{ data, error }` when awaited.
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const OK_EMPTY = { data: [], error: null };

// Per-table results, keyed by call number for tables hit more than once
// (global_community_profiles is queried once for new-member spotlights and
// again for post-author lookups).
let tableResults: Record<string, Array<{ data: unknown; error: unknown }>>;
let tableCallCounts: Record<string, number>;

const fromMock = vi.fn((table: string) => {
  tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1;
  const queue = tableResults[table] ?? [];
  const result = queue[tableCallCounts[table] - 1] ?? queue[queue.length - 1] ?? OK_EMPTY;
  return makeBuilder(result);
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { fetchCommunityNews } from '@/hooks/useNewsFeed';

describe('fetchCommunityNews — per-section Supabase error logging', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tableResults = {};
    tableCallCounts = {};
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs (and degrades gracefully, without throwing) on a global_community_events error', async () => {
    tableResults.global_community_events = [{ data: null, error: { message: 'boom' } }];
    const articles = await fetchCommunityNews(10, null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('global_community_events'),
      expect.objectContaining({ message: 'boom' }),
    );
    expect(articles).toEqual([]);
  });

  it('logs on a media_uploads error', async () => {
    tableResults.media_uploads = [{ data: null, error: { message: 'boom' } }];
    const articles = await fetchCommunityNews(10, null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('media_uploads'),
      expect.objectContaining({ message: 'boom' }),
    );
    expect(articles).toEqual([]);
  });

  it('logs on the new-members global_community_profiles error', async () => {
    tableResults.global_community_profiles = [{ data: null, error: { message: 'boom' } }];
    const articles = await fetchCommunityNews(10, null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('new-member'),
      expect.objectContaining({ message: 'boom' }),
    );
    expect(articles).toEqual([]);
  });

  it('logs on a user_follows error (viewerId present)', async () => {
    tableResults.user_follows = [{ data: null, error: { message: 'boom' } }];
    const articles = await fetchCommunityNews(10, 'viewer-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('user_follows'),
      expect.objectContaining({ message: 'boom' }),
    );
    expect(articles).toEqual([]);
  });

  it('logs on a profile_posts error (viewer follows someone)', async () => {
    tableResults.user_follows = [{ data: [{ following_id: 'author-1' }], error: null }];
    tableResults.profile_posts = [{ data: null, error: { message: 'boom' } }];
    const articles = await fetchCommunityNews(10, 'viewer-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('profile_posts'),
      expect.objectContaining({ message: 'boom' }),
    );
    expect(articles).toEqual([]);
  });

  it('logs on the post-author global_community_profiles error (second call, posts exist)', async () => {
    tableResults.user_follows = [{ data: [{ following_id: 'author-1' }], error: null }];
    tableResults.profile_posts = [
      {
        data: [
          {
            id: 'p1',
            user_id: 'author-1',
            content: 'hello world',
            image_url: null,
            video_url: null,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      },
    ];
    // First call (new-members) succeeds empty; second call (post-authors) errors.
    tableResults.global_community_profiles = [
      { data: [], error: null },
      { data: null, error: { message: 'boom' } },
    ];

    const articles = await fetchCommunityNews(10, 'viewer-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('post-author'),
      expect.objectContaining({ message: 'boom' }),
    );
    // The post itself is still included (author name falls back gracefully) —
    // a section failure here degrades the author's display name, not the post.
    expect(articles).toHaveLength(1);
    expect(articles[0].id).toBe('post-p1');
  });

  it('does not log anything when every section succeeds', async () => {
    const articles = await fetchCommunityNews(10, null);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(articles).toEqual([]);
  });
});
