/**
 * VTID-04584 — the "All" tab shows members who joined in the last 7 days,
 * so the community is reminded to greet them (it previously showed them only
 * on the Community tab).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

const resultsByTable: Record<string, { data: unknown; error: unknown }> = {};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => makeBuilder(resultsByTable[table] ?? { data: [], error: null }) },
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));
vi.mock('@/lib/query-persist', () => ({ persistQueryCacheNow: vi.fn() }));

import { fetchNewsFeedCandidates } from '@/hooks/useAllNewsFeed';
import { rankFeed, type FeedItem } from '@/lib/news-feed-ranker';

describe('All feed — new members (VTID-04584)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    for (const k of Object.keys(resultsByTable)) delete resultsByTable[k];
    resultsByTable.global_community_profiles = {
      data: [
        { user_id: 'amy', display_name: 'Amy', avatar_url: null, bio: null, created_at: '2026-09-25T08:37:00Z' },
        { user_id: 'viewer-1', display_name: 'Me', avatar_url: null, bio: null, created_at: '2026-09-24T08:00:00Z' },
      ],
      error: null,
    };
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
  });
  afterEach(() => fetchSpy.mockRestore());

  it('returns recent members as new_member items, excluding the viewer', async () => {
    const result = await fetchNewsFeedCandidates('viewer-1', null);
    expect(result.newMembers).toHaveLength(1);
    expect(result.newMembers[0]).toMatchObject({ kind: 'new_member', user_id: 'amy', id: 'new-member-amy' });
  });

  it('hides members the viewer has already messaged (VTID-04590)', async () => {
    resultsByTable.chat_messages = { data: [{ receiver_id: 'amy' }], error: null };
    const result = await fetchNewsFeedCandidates('viewer-1', null);
    expect(result.newMembers).toHaveLength(0);
  });

  it('keeps the card when the greeted-lookup fails (fail open)', async () => {
    resultsByTable.chat_messages = { data: null, error: { message: 'boom' } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await fetchNewsFeedCandidates('viewer-1', null);
    expect(result.newMembers.map((m) => m.user_id)).toEqual(['amy']);
    spy.mockRestore();
  });

  it('rankFeed keeps new_member items, placed by join time among posts', () => {
    const items: FeedItem[] = [
      { id: 'new-member-amy', kind: 'new_member', user_id: 'amy', display_name: 'Amy', avatar_url: null, bio: null, published_at: '2026-09-25T08:00:00Z' },
      {
        id: 'post-1', kind: 'post', source: 'post', post_id: '1', user_id: 'x', author_name: 'X', author_avatar: null,
        content: 'hi', image_url: null, video_url: null, background_style: null, mentions: [], likes_count: 0,
        comments_count: 0, followed: false, tags: [], published_at: '2026-09-25T10:00:00Z',
      },
    ];
    expect(rankFeed(items).map((i) => i.id)).toEqual(['post-1', 'new-member-amy']);
  });
});
