/**
 * useAllNewsFeed.ts — fetchNewsFeedCandidates()/fetchAuthors() previously
 * discarded every Supabase result's `error` field, including inside
 * Promise.allSettled — a settled promise's `status` is "fulfilled" even
 * when the query itself resolved with `{data: null, error: {...}}`.
 *
 * Two distinct real-world impacts this pins the fix for:
 * 1. If profile_posts/media_uploads errors, the whole "All" feed on Home
 *    renders empty — indistinguishable from "no posts exist" — with
 *    nothing logged anywhere.
 * 2. If user_muted_authors/user_blocked_authors errors, a viewer's
 *    explicitly blocked/muted authors' posts can silently reappear.
 *
 * The fix is log-only (loud console.error on every path) rather than
 * changing the existing degrade-gracefully behavior, since failing the
 * whole feed closed on any transient filter-query error would be a worse
 * outage than the (logged, rare) fail-open risk.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

const resultsByTable: Record<string, { data: unknown; error: unknown }> = {};
const fromMock = vi.fn((table: string) => makeBuilder(resultsByTable[table] ?? { data: [], error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));
vi.mock('@/lib/query-persist', () => ({ persistQueryCacheNow: vi.fn() }));

import { fetchNewsFeedCandidates } from '@/hooks/useAllNewsFeed';

describe('fetchNewsFeedCandidates — swallowed-error visibility', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const k of Object.keys(resultsByTable)) delete resultsByTable[k];
    resultsByTable.profile_posts = { data: [], error: null };
    resultsByTable.media_uploads = { data: [], error: null };
    resultsByTable.feature_announcements = { data: [], error: null };
    resultsByTable.user_follows = { data: [], error: null };
    resultsByTable.user_hidden_posts = { data: [], error: null };
    resultsByTable.user_muted_authors = { data: [], error: null };
    resultsByTable.user_blocked_authors = { data: [], error: null };
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // fetchTopPerformer hits the gateway directly — make it resolve to
    // "not ok" quickly rather than needing a real network call.
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('logs when profile_posts errors, instead of silently rendering an empty feed', async () => {
    resultsByTable.profile_posts = { data: null, error: { message: 'connection reset' } };

    const result = await fetchNewsFeedCandidates('viewer-1', null);

    expect(result.posts).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('[useAllNewsFeed] Error fetching profile_posts:', expect.objectContaining({ message: 'connection reset' }));
  });

  it('logs when media_uploads errors', async () => {
    resultsByTable.media_uploads = { data: null, error: { message: 'connection reset' } };

    await fetchNewsFeedCandidates('viewer-1', null);

    expect(errorSpy).toHaveBeenCalledWith('[useAllNewsFeed] Error fetching media_uploads:', expect.objectContaining({ message: 'connection reset' }));
  });

  it('logs when user_muted_authors errors — the mute-filter fail-open case', async () => {
    resultsByTable.user_muted_authors = { data: null, error: { message: 'connection reset' } };

    await fetchNewsFeedCandidates('viewer-1', null);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('user_muted_authors'),
      expect.objectContaining({ message: 'connection reset' }),
    );
  });

  it('logs when user_blocked_authors errors — the block-filter fail-open case', async () => {
    resultsByTable.user_blocked_authors = { data: null, error: { message: 'connection reset' } };

    await fetchNewsFeedCandidates('viewer-1', null);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('user_blocked_authors'),
      expect.objectContaining({ message: 'connection reset' }),
    );
  });

  it('logs nothing when every query succeeds', async () => {
    await fetchNewsFeedCandidates('viewer-1', null);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs when global_community_profiles (author resolution) errors', async () => {
    resultsByTable.profile_posts = {
      data: [{ id: 'p1', user_id: 'author-1', content: 'hi', is_public: true, moderation_status: 'active', created_at: '2026-01-01T00:00:00Z', likes_count: 0, comments_count: 0 }],
      error: null,
    };
    resultsByTable.global_community_profiles = { data: null, error: { message: 'connection reset' } };

    await fetchNewsFeedCandidates('viewer-1', null);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('global_community_profiles'),
      expect.objectContaining({ message: 'connection reset' }),
    );
  });
});
