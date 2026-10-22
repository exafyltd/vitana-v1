/**
 * VTID-05298 (Native Wave 2, news lane) — the reader data shapes.
 *
 * Mirrors the fields the two readers use from the web types: `NewsArticle`
 * (`src/hooks/useNewsFeed.ts`) and `PostFeedItem` (`src/lib/news-feed-ranker.ts`).
 * These are kept local on purpose: the web modules that declare them are not
 * class-A (`useNewsFeed` imports the Supabase client; `news-feed-ranker` uses
 * `import.meta`), so importing them — even `import type` — drags the web
 * `src/` graph into the native typecheck, which fails on `import.meta.glob` /
 * `import.meta.env`. Only the pure helper `news-images.ts` crosses the bridge
 * (through `@vitana/core`); the shapes are declared here. The feed composition
 * logic itself is never re-implemented (requirement R1.4) — these are field
 * shapes, not logic.
 */

/** Subset of `src/hooks/useNewsFeed.ts` `NewsArticle` the reader renders. */
export type NewsArticle = {
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
  member_user_id?: string | null;
  member_display_name?: string | null;
};

/** Subset of `src/lib/news-feed-ranker.ts` `PostFeedItem` the reader builds and renders. */
export type PostMention = { user_id: string; display_name: string };

export type PostFeedItem = {
  id: string;
  kind: 'post';
  source: 'post' | 'media';
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  background_style: string | null;
  mentions: PostMention[];
  likes_count: number;
  comments_count: number;
  followed: boolean;
  tags: string[];
  published_at: string;
};
