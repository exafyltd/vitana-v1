/**
 * VTID-05108 — News focus-feed adapters (data → VCard slots). Pure: no hooks,
 * no JSX, no i18n. Screens add translated eyebrows/meta and their own actions.
 * Only fields the feed already carries are mapped — nothing is invented
 * (contract SR-24).
 */
import type { NewsArticle } from '@/hooks/useNewsFeed';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import type { MatchFeedItem, NewMemberFeedItem, PerformerFeedItem } from '@/lib/news-feed-ranker';
import type { VCardData } from './index';

/**
 * A legacy-tab news item (Longevity / Community tabs). `fallbackImage` is the
 * keyword-matched category photo the legacy grid already uses.
 */
export function newsArticleToVCard(article: NewsArticle, fallbackImage: string | null): VCardData {
  return {
    key: article.id,
    media: { src: article.image_url || fallbackImage || null, alt: '' },
    eyebrow: article.source_name,
    title: article.title,
    body: article.summary ?? undefined,
    href: `/news/${article.id}`,
  };
}

/** A person the feed suggests: a match, a most-improved member or a new member. */
export function feedPersonToVCard(item: MatchFeedItem | PerformerFeedItem | NewMemberFeedItem): VCardData {
  const name = item.display_name?.trim().replace(/\s+/g, ' ') ?? '';
  return {
    key: item.id,
    media: { src: item.avatar_url ?? null, alt: '' },
    title: name,
    href: `/u/${item.user_id}`,
  };
}

/** A community event (rail "Today"). Time and place are formatted by the screen. */
export function communityEventToVCard(event: CommunityEvent): VCardData {
  return {
    key: event.id,
    media: { src: event.image_url ?? null, alt: '' },
    title: event.title,
    meta: event.location ?? undefined,
    href: `/comm/events-meetups?event=${encodeURIComponent(event.id)}`,
  };
}
