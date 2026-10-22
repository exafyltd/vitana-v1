/**
 * VTID-05297 (Native Wave 2, home-feed lane) — shared local types for the
 * Home feed. The ranked feed items come from the feed port
 * (`@vitana/core/news-feed-ranker` via src/ports/feed); these are the shapes
 * the native data layer produces that have no home there.
 */

/**
 * Native twin of the web `NewsArticle` (src/hooks/useNewsFeed.ts). The merged
 * community-news shape returned by `useCommunityNews`. Columns and transforms
 * mirror the web hook exactly.
 */
export interface NewsArticle {
  id: string;
  source: 'longevity' | 'community';
  source_name: string;
  title: string;
  link: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string;
  tags: string[];
  category: string;
  /** Set on new-member cards: the member the card asks the viewer to greet. */
  member_user_id?: string | null;
  /** New-member cards: the member's display name (for the avatar initial). */
  member_display_name?: string | null;
}

/** One page of the gateway longevity-news endpoint (src/hooks/useNewsFeed.ts). */
export interface LongevityNewsResponse {
  ok: boolean;
  items: Array<{
    id: string;
    source_name: string;
    source_url: string;
    title: string;
    link: string;
    summary: string | null;
    image_url: string | null;
    published_at: string;
    tags: string[];
    source_type: string;
  }>;
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
