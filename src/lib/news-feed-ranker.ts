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
 *   1. New unseen match            (capped — at most `maxPinnedMatches`)
 *   2. Opt-in "most improved" spotlight (consent-gated, supplied by gateway)
 *   3. Posts from followed members  → newest first, regardless of media
 *   4. Posts from other members     → newest first, regardless of media
 *   5. Public-source news           → interleaved, not starved
 *
 * Within each group: newest first, engagement second, stable id last.
 * Follow status outranks media format (a followed member's text post beats a
 * stranger's video). Public news is interleaved at a tunable cadence rather
 * than always dumped last, so it is never permanently starved — this is a
 * longevity-news product and public science is core, not filler.
 */

import type { MatchReason } from "@/lib/matchReason";

export type FeedItemKind = "match" | "performer" | "post" | "article";

/** A member tagged in a post body via an inline @mention. */
export interface PostMention {
  user_id: string;
  display_name: string;
}

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
  /** Raw reason (structured or legacy string) — localize at render time. */
  match_reason: MatchReason | null;
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
  /** Optional coloured-background preset id for text-only posts (null = plain). */
  background_style: string | null;
  /** Members tagged via inline @mentions, for rendering clickable links. */
  mentions: PostMention[];
  likes_count: number;
  comments_count: number;
  /** Author is followed by the current viewer. */
  followed: boolean;
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

  // 3 + 4. Posts — followed before others, then "show less" penalty, then
  //    newest regardless of media format, then engagement, then stable id.
  posts.sort((a, b) => {
    if (a.followed !== b.followed) return a.followed ? -1 : 1;
    const pa = downrankPenalty(a.tags, downranked);
    const pb = downrankPenalty(b.tags, downranked);
    if (pa !== pb) return pa - pb;
    const ta = ts(a.published_at);
    const tb = ts(b.published_at);
    if (ta !== tb) return tb - ta;
    const ea = a.likes_count + a.comments_count;
    const eb = b.likes_count + b.comments_count;
    if (ea !== eb) return eb - ea;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

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

  // Compose: pinned community items first, then interleave the post stream with
  // public news at the configured cadence so neither side is starved.
  const result: FeedItem[] = [...pinnedMatches, ...pinnedPerformer];
  let ai = 0;
  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]);
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
      return item.followed ? "screens.home.whyFollowed" : "screens.home.whyCommunity";
    case "article":
      return "screens.home.whyPublic";
  }
}
