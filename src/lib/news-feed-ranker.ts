/**
 * VTID-03319 — Pure, deterministic ranker for the unified "All News" feed.
 *
 * The feed merges several candidate sources (loaded client-side under RLS plus
 * one narrow gateway lookup for the opt-in spotlight) into one ordered list.
 * This module contains ZERO IO — it takes already-loaded candidates and feed
 * preferences and returns a stable ordering, so it can be unit-tested in
 * isolation (see scripts/news-feed-ranker-regression.mjs).
 *
 * Deterministic order (approved design):
 *   1. VIP-author posts            → always first, newest first (see config/vip-authors.ts)
 *   2. New unseen match            (capped — at most `maxPinnedMatches`)
 *   3. Opt-in "most improved" spotlight (consent-gated, supplied by gateway)
 *   4. All other posts             → strictly newest first (chronological), any author
 *   5. Public-source news          → interleaved into the post stream, not starved
 *
 * Ordering rules (updated): VIP authors (a small allow-list of community-face
 * accounts) are pinned to the very top regardless of follow status, so they are
 * always visible. Every *other* post is ordered purely chronologically (newest
 * first) — follow status no longer changes a non-VIP post's position; it only
 * drives the "why you're seeing this" label. Engagement and a stable id break
 * ties. Public news is interleaved at a tunable cadence rather than dumped last,
 * so it is never permanently starved — this is a longevity-news product and
 * public science is core, not filler.
 */

export type FeedItemKind = "match" | "performer" | "post" | "article";

interface FeedItemBase {
  /** Stable, globally-unique id (e.g. "post-<uuid>", "match-<uuid>"). */
  id: string;
  kind: FeedItemKind;
  /** ISO timestamp used for recency ordering. */
  published_at: string;
}

export interface MatchFeedItem extends FeedItemBase {
  kind: "match";
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  match_reason: string;
  compatibility_score: number;
}

export interface PerformerFeedItem extends FeedItemBase {
  kind: "performer";
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  /** Index improvement (delta) that earned the spotlight, for the "why" label. */
  improvement: number;
}

export interface PostFeedItem extends FeedItemBase {
  kind: "post";
  /** Backend the post lives in — selects the like/comment tables for inline actions. */
  source: "post" | "media";
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  /** Author is followed by the current viewer. Drives the label, not the order. */
  followed: boolean;
  /** Author is a pinned VIP (community-face account) — always boosted to the top. */
  vip: boolean;
  tags: string[];
}

export interface ArticleFeedItem extends FeedItemBase {
  kind: "article";
  source_name: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  link: string | null;
  tags: string[];
}

export type FeedItem = MatchFeedItem | PerformerFeedItem | PostFeedItem | ArticleFeedItem;

export interface RankOptions {
  /** Item ids the user explicitly hid. */
  hiddenIds?: Iterable<string>;
  /** Article source names the user muted. */
  mutedSources?: Iterable<string>;
  /** Tag → "show less" count; matching items are demoted within their group. */
  downrankedTags?: Record<string, number>;
  /** Match ids already shown to the user — excluded from the pinned slot. */
  seenMatchIds?: Iterable<string>;
  /** Insert one public-news item after every N community items (default 4). */
  articleInterleave?: number;
  /** Max matches pinned to the top (default 1, to avoid match spam). */
  maxPinnedMatches?: number;
}

function ts(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
}

function downrankPenalty(tags: string[] | undefined, downranked: Record<string, number>): number {
  if (!tags || !tags.length) return 0;
  let p = 0;
  for (const t of tags) p += downranked[t] || 0;
  return p;
}

/**
 * Order the supplied candidates into the final feed. Pure and deterministic:
 * the same inputs always yield the same output (ties broken by stable id).
 */
export function rankFeed(items: FeedItem[], options: RankOptions = {}): FeedItem[] {
  const hidden = new Set(options.hiddenIds ?? []);
  const muted = new Set(options.mutedSources ?? []);
  const seenMatches = new Set(options.seenMatchIds ?? []);
  const downranked = options.downrankedTags ?? {};
  const interleave = Math.max(1, options.articleInterleave ?? 4);
  const maxPinnedMatches = Math.max(0, options.maxPinnedMatches ?? 1);

  const matches: MatchFeedItem[] = [];
  const performers: PerformerFeedItem[] = [];
  const posts: PostFeedItem[] = [];
  const articles: ArticleFeedItem[] = [];

  for (const item of items) {
    if (hidden.has(item.id)) continue;
    switch (item.kind) {
      case "match":
        matches.push(item);
        break;
      case "performer":
        performers.push(item);
        break;
      case "post":
        posts.push(item);
        break;
      case "article":
        if (muted.has(item.source_name)) continue;
        articles.push(item);
        break;
    }
  }

  // 1. Matches — highest compatibility first, newest, stable id. Exclude already
  //    seen ones from the pinned slot so the same match doesn't dominate every
  //    visit; cap the pinned count to avoid match spam.
  const freshMatches = matches.filter((m) => !seenMatches.has(m.id));
  freshMatches.sort(
    (a, b) =>
      b.compatibility_score - a.compatibility_score ||
      ts(b.published_at) - ts(a.published_at) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const pinnedMatches = freshMatches.slice(0, maxPinnedMatches);

  // 2. Spotlight — gateway returns at most one; guard against duplicates.
  performers.sort(
    (a, b) =>
      b.improvement - a.improvement ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const pinnedPerformer = performers.slice(0, 1);

  // Posts — VIP authors first (always, regardless of follow status), then every
  //    other post strictly newest-first (chronological). Within the non-VIP
  //    group the user's "show less" penalty still demotes tagged items; VIPs are
  //    never demoted. Engagement and a stable id break remaining ties.
  posts.sort((a, b) => {
    if (a.vip !== b.vip) return a.vip ? -1 : 1;
    if (!a.vip) {
      const pa = downrankPenalty(a.tags, downranked);
      const pb = downrankPenalty(b.tags, downranked);
      if (pa !== pb) return pa - pb;
    }
    const ta = ts(a.published_at);
    const tb = ts(b.published_at);
    if (ta !== tb) return tb - ta;
    const ea = a.likes_count + a.comments_count;
    const eb = b.likes_count + b.comments_count;
    if (ea !== eb) return eb - ea;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const vipPosts = posts.filter((p) => p.vip);
  const otherPosts = posts.filter((p) => !p.vip);

  // 5. Public news — newest first, "show less" penalty applied, stable id.
  articles.sort((a, b) => {
    const pa = downrankPenalty(a.tags, downranked);
    const pb = downrankPenalty(b.tags, downranked);
    if (pa !== pb) return pa - pb;
    const ta = ts(a.published_at);
    const tb = ts(b.published_at);
    if (ta !== tb) return tb - ta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Compose: VIP posts lead (always on top), then the pinned match + spotlight,
  // then the chronological stream of every other post with public news
  // interleaved at the configured cadence so neither side is starved.
  const result: FeedItem[] = [...vipPosts, ...pinnedMatches, ...pinnedPerformer];
  let ai = 0;
  for (let i = 0; i < otherPosts.length; i++) {
    result.push(otherPosts[i]);
    if ((i + 1) % interleave === 0 && ai < articles.length) {
      result.push(articles[ai++]);
    }
  }
  for (; ai < articles.length; ai++) result.push(articles[ai]);

  return result;
}

/** The "why you're seeing this" reason key for a feed item (i18n lookup key). */
export function reasonKeyFor(item: FeedItem): string {
  switch (item.kind) {
    case "match":
      return "screens.home.whyMatch";
    case "performer":
      return "screens.home.whySpotlight";
    case "post":
      if (item.vip) return "screens.home.whyVip";
      return item.followed ? "screens.home.whyFollowed" : "screens.home.whyCommunity";
    case "article":
      return "screens.home.whyPublic";
  }
}
