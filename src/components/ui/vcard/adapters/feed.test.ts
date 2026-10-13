/** VTID-05108 — News focus-feed adapters. */
import { describe, expect, it } from 'vitest';
import { communityEventToVCard, feedPersonToVCard, newsArticleToVCard } from './index';
import type { NewsArticle } from '@/hooks/useNewsFeed';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import type { MatchFeedItem, NewMemberFeedItem } from '@/lib/news-feed-ranker';

const article = (over: Partial<NewsArticle> = {}): NewsArticle => ({
  id: 'a1', source: 'longevity', source_name: 'Longevity Lab', title: 'Sleep and HRV', link: 'https://x', summary: 'Short',
  image_url: 'https://img/a.jpg', published_at: '2026-10-12T08:00:00Z', tags: [], category: 'general', ...over,
});

describe('VTID-05108 focus-feed adapters', () => {
  it('news article: own image first, category fallback second, detail route', () => {
    expect(newsArticleToVCard(article(), 'https://fallback').media?.src).toBe('https://img/a.jpg');
    expect(newsArticleToVCard(article({ image_url: null }), 'https://fallback').media?.src).toBe('https://fallback');
    const d = newsArticleToVCard(article({ image_url: null }), null);
    expect(d.media?.src).toBeNull();
    expect(d).toMatchObject({ key: 'a1', eyebrow: 'Longevity Lab', title: 'Sleep and HRV', body: 'Short', href: '/news/a1' });
  });

  it('person: name tidied, avatar as media, profile route; nothing invented', () => {
    const m: MatchFeedItem = {
      id: 'match-1', kind: 'match', published_at: '', user_id: 'u9', display_name: ' Jana   K. ', avatar_url: null,
      match_reason: null, compatibility_score: 81,
    };
    expect(feedPersonToVCard(m)).toEqual({ key: 'match-1', media: { src: null, alt: '' }, title: 'Jana K.', href: '/u/u9' });
    const n: NewMemberFeedItem = { id: 'mem-1', kind: 'new_member', published_at: '', user_id: 'u2', display_name: null, avatar_url: 'a.png', bio: null };
    expect(feedPersonToVCard(n)).toMatchObject({ title: '', media: { src: 'a.png' } });
  });

  it('community event: title, location as meta, events deep link', () => {
    const e = {
      id: 'ev 1', title: 'Yoga in the park', location: 'Ada Ciganlija', image_url: undefined, start_time: '2026-10-13T16:00:00Z',
    } as unknown as CommunityEvent;
    expect(communityEventToVCard(e)).toEqual({
      key: 'ev 1', media: { src: null, alt: '' }, title: 'Yoga in the park', meta: 'Ada Ciganlija', href: '/comm/events-meetups?event=ev%201',
    });
  });
});
