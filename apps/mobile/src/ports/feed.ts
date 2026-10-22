/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the pure feed logic through one
 * port, from `@vitana/core` (the web `src/lib/feed-compose.ts`,
 * `src/lib/news-feed-ranker.ts` and `src/components/vitana/vitana-card-catalog.ts`).
 * Home's screen and data files read these only through this port, never from
 * `@vitana/core` directly (tests/ports.test.ts), the same rule src/ports/news.ts
 * follows.
 */
export {
  composeFeed,
  withHomeNewCards,
  placementOf,
  splitByPlacement,
  RAIL_KINDS,
  HOME_NEW_CARD_CAP,
  type ComposedEntry,
  type FeedPlacement,
} from '@vitana/core/feed-compose';

export {
  rankFeed,
  motivationKeyFor,
  type FeedItem,
  type FeedItemKind,
  type ArticleFeedItem,
  type PostFeedItem,
  type PostMention,
  type MatchFeedItem,
  type PerformerFeedItem,
  type FeatureAnnouncementFeedItem,
  type NewMemberFeedItem,
  type RankOptions,
} from '@vitana/core/news-feed-ranker';

export {
  pickHomeServerCards,
  isVitanaCardType,
  cardCategory,
  isServerCardPlaced,
  CARD_SCREENS,
  CARD_DEEP_LINKS,
  HOME_SERVER_CARD_LIMIT,
  HOME_ENRICHMENT_CARD_LIMIT,
  type VitanaCardType,
  type CardCategory,
  type EnrichmentCardType,
  type FeatureCardType,
  type BoostCardType,
  type CardScreen,
  type CardScreenConfig,
} from '@vitana/core/vitana-card-catalog';
