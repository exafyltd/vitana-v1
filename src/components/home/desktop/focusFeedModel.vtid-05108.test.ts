/** VTID-05108 — focus-feed model (stage vs rail) and rail helpers. */
import { describe, expect, it } from 'vitest';
import type { FeedItem } from '@/lib/news-feed-ranker';
import type { NewsArticle } from '@/hooks/useNewsFeed';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { modelFromArticles, modelFromFeed, upNextOf } from './focusFeedModel';
import { todaysEvents } from './focusCardUtils';

const item = (id: string, kind: string) => ({ id, kind, published_at: '2026-10-08T00:00:00Z' }) as unknown as FeedItem;

describe('modelFromFeed', () => {
  it('stage = posts and articles in ranked order; rail = people (suggested first) and feature news', () => {
    const m = modelFromFeed([
      item('mem-1', 'new_member'),
      item('post-1', 'post'),
      item('match-1', 'match'),
      item('article-1', 'article'),
      item('feat-1', 'feature_announcement'),
      item('perf-1', 'performer'),
      item('post-2', 'post'),
    ]);
    expect(m.stage.map((s) => s.key)).toEqual(['post-1', 'article-1', 'post-2']);
    expect(m.stage.map((s) => s.type)).toEqual(['post', 'article', 'post']);
    expect(m.people.map((p) => p.id)).toEqual(['match-1', 'perf-1', 'mem-1']);
    expect(m.features.map((f) => f.id)).toEqual(['feat-1']);
  });

  it('an empty feed is an empty model', () => {
    expect(modelFromFeed([])).toEqual({ stage: [], people: [], features: [] });
  });
});

describe('modelFromArticles (Longevity / Community tabs)', () => {
  const a = (id: string, member?: string): NewsArticle => ({
    id, source: 'community', source_name: 'MAXINA', title: id, link: null, summary: 'hi', image_url: 'av.png',
    published_at: '2026-10-08T00:00:00Z', tags: [], category: 'general', member_user_id: member ?? null, member_display_name: member ? 'Ana' : null,
  });

  it('new-member entries go to the rail as people, everything else to the stage', () => {
    const m = modelFromArticles([a('n1'), a('welcome', 'u7'), a('n2')]);
    expect(m.stage.map((s) => s.key)).toEqual(['n1', 'n2']);
    expect(m.people).toEqual([
      { id: 'welcome', kind: 'new_member', published_at: '2026-10-08T00:00:00Z', user_id: 'u7', display_name: 'Ana', avatar_url: 'av.png', bio: 'hi' },
    ]);
  });
});

describe('upNextOf', () => {
  it('returns the items after the focused one, at most three', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    expect(upNextOf(list, 0)).toEqual(['b', 'c', 'd']);
    expect(upNextOf(list, 3)).toEqual(['e']);
    expect(upNextOf(list, 4)).toEqual([]);
    expect(upNextOf(list, -1)).toEqual(['b', 'c', 'd']);
  });
});

describe('todaysEvents', () => {
  const now = new Date(2026, 9, 13, 12, 0, 0);
  const ev = (id: string, start: Date, end: Date | null = null) =>
    ({ id, title: id, start_time: start.toISOString(), end_time: end ? end.toISOString() : null }) as unknown as CommunityEvent;

  it('keeps today’s events that have not ended, soonest first, max three', () => {
    const out = todaysEvents(
      [
        ev('evening', new Date(2026, 9, 13, 18)),
        ev('ended', new Date(2026, 9, 13, 8), new Date(2026, 9, 13, 9)),
        ev('running', new Date(2026, 9, 13, 11), new Date(2026, 9, 13, 13)),
        ev('tomorrow', new Date(2026, 9, 14, 9)),
        ev('yesterday', new Date(2026, 9, 12, 18)),
        ev('noon', new Date(2026, 9, 13, 12, 30)),
        ev('night', new Date(2026, 9, 13, 22)),
      ],
      now,
    );
    expect(out.map((e) => e.id)).toEqual(['running', 'noon', 'evening']);
  });

  it('ignores events with an unreadable start time', () => {
    expect(todaysEvents([ev('x', new Date(2026, 9, 13, 18)), { id: 'bad', start_time: 'nope' } as unknown as CommunityEvent], now).map((e) => e.id)).toEqual(['x']);
  });
});
