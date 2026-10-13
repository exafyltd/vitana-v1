/**
 * VTID-05105 — data → VCard slot mappers. Pure functions (no hooks, no JSX) so
 * every screen maps the same record the same way; screens add their own
 * actions. More kinds (event, live room, service, provider, group, member)
 * land with the phases that first render them.
 */
import type { ArticleFeedItem, PostFeedItem } from '@/lib/news-feed-ranker';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';
import { formatPrice } from '@/hooks/useMarketplace';
import type { VCardMedia } from '../VCard';

export interface VCardData {
  key: string;
  media?: VCardMedia;
  eyebrow?: string;
  title: string;
  meta?: string;
  body?: string;
  href?: string;
}

const firstLine = (text: string) => text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';

/** A member post. Video posts keep the poster-less placeholder; the screen supplies the player via `mediaSlot`. */
export function postToVCard(post: PostFeedItem): VCardData {
  const hasVisual = !!(post.image_url || post.video_url);
  return {
    key: post.id,
    media: hasVisual ? { src: post.image_url, alt: '', ratio: 'landscape' } : undefined,
    eyebrow: post.author_name,
    title: firstLine(post.content),
    body: post.content,
    href: `/post/${post.source}/${post.post_id}`,
  };
}

/** A longevity news article. */
export function articleToVCard(article: ArticleFeedItem): VCardData {
  return {
    key: article.id,
    media: { src: article.image_url, alt: '' },
    eyebrow: article.source_name,
    title: article.title,
    body: article.summary ?? undefined,
    href: article.link ?? undefined,
  };
}

export { newsArticleToVCard, feedPersonToVCard, communityEventToVCard } from './feed';

/** A marketplace product. Price is formatted with the existing marketplace helper. */
export function productToVCard(product: MarketplaceProduct): VCardData {
  const price = formatPrice(product.price_cents, product.currency);
  return {
    key: product.id,
    media: { src: product.images?.[0] ?? null, alt: product.title },
    eyebrow: product.brand ?? product.category ?? undefined,
    title: product.title,
    meta: price || undefined,
    href: `/discover/product/${product.id}`,
  };
}
export * from './discover';
export { eventToVCard } from './event';
export { liveRoomToVCard } from './liveRoom';
export { groupToVCard } from './group';
export { memberToVCard } from './member';
