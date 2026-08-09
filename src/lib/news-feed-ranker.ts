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
 *   3. Community posts              → newest first, regardless of follow/media
 *   4. Public-source news           → interleaved, not starved
 *
 * Within each group: newest first, engagement second, stable id last.
 * Within this ranker, follow status is display metadata only; it never changes
 * post order. Public news is interleaved at a tunable cadence rather than
 * always dumped last, so it is never permanently starved — this is a
 * longevity-news product and public science is core, not filler.
 */

import type { MatchReason } from "@/lib/matchReason";

export type FeedItemKind = "match" | "performer" | "post" | "article" | "feature_announcement";

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

/**
 * A system-authored "product discovery" post — either a brand-new-feature
 * launch announcement or a daily "did you know" tip. Rendered by
 * FeatureAnnouncementCard (src/components/home/FeatureAnnouncementCard.tsx).
 * `feature_title`/`description` are already resolved to the viewer's locale
 * by whichever source supplies these items.
 */
export interface FeatureAnnouncementFeedItem extends FeedItemBase {
  kind: "feature_announcement";
  variant: "brand-new-feature" | "did-you-know-feature";
  feature_title: string;
  description: string;
  deep_link: string;
}

export type FeedItem =
  | MatchFeedItem
  | PerformerFeedItem
  | PostFeedItem
  | ArticleFeedItem
  | FeatureAnnouncementFeedItem;

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
  /**
   * Max feature-announcement cards eligible to appear at all (default 1 —
   * one per day). NOT pinned to the top — the eligible ones are merged into
   * the chronological post stream by their own publish time, so they get
   * pushed down naturally as newer posts arrive.
   */
  maxPinnedFeatureAnnouncements?: number;
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
  const maxPinnedFeatureAnnouncements = Math.max(0, options.maxPinnedFeatureAnnouncements ?? 1);

  const matches: MatchFeedItem[] = [];
  const performers: PerformerFeedItem[] = [];
  const postsOnly: PostFeedItem[] = [];
  const articles: ArticleFeedItem[] = [];
  const featureAnnouncements: FeatureAnnouncementFeedItem[] = [];

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
        postsOnly.push(item);
        break;
      case "article":
        if (muted.has(item.source_name)) continue;
        articles.push(item);
        break;
      case "feature_announcement":
        featureAnnouncements.push(item);
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

  // System-authored feature-discovery cards are NOT pinned — they're a
  // "classic part of the feed": ranked by their own publish time, merged
  // into the same chronological stream as community posts, and naturally
  // pushed down as newer posts arrive. (Previously always prepended to the
  // very top with no decay, which meant a card could sit there for weeks —
  // confirmed as unwanted behavior.) `maxPinnedFeatureAnnouncements` caps how
  // many recent ones are eligible to appear at all, so a backlog of tips
  // doesn't flood the feed once several exist.
  featureAnnouncements.sort(
    (a, b) => ts(b.published_at) - ts(a.published_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const eligibleFeatureAnnouncements = featureAnnouncements.slice(0, maxPinnedFeatureAnnouncements);

  // 3. Posts — "show less" penalty, then newest regardless of follow status or
  //    media format, then engagement, then stable id. Feature-announcement
  //    cards are merged in here (0 engagement, no downrank penalty) so they
  //    sort purely by recency alongside everything else.
  const posts: (PostFeedItem | FeatureAnnouncementFeedItem)[] = [
    ...postsOnly,
    ...eligibleFeatureAnnouncements,
  ];
  posts.sort((a, b) => {
    const pa = a.kind === "post" ? downrankPenalty(a.tags, downranked) : 0;
    const pb = b.kind === "post" ? downrankPenalty(b.tags, downranked) : 0;
    if (pa !== pb) return pa - pb;
    const ta = ts(a.published_at);
    const tb = ts(b.published_at);
    if (ta !== tb) return tb - ta;
    const ea = a.kind === "post" ? a.likes_count + a.comments_count : 0;
    const eb = b.kind === "post" ? b.likes_count + b.comments_count : 0;
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
  // Feature-announcement cards are NOT pinned here — see the sort above.
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

/**
 * Client-side heuristic rules mapping a post's caption to a motivational-note
 * i18n key. Ordered — the first match wins. Deliberately simple (keyword
 * matching, DE + EN) since `profile_posts` carries no category/mood/topic
 * column to classify against (see news-feed-ranker regression tests). The
 * eventual replacement is server-side classification from the post's image,
 * text, topic, and the viewer's relationship with the author.
 */
// A positive achievement/progress stem doesn't mean the post is a success —
// "nicht geschafft", "kein Fortschritt", "erfolglos" describe a setback and
// should read as an invitation to lend support, not a celebration prompt.
const POSITIVE_STEM_RE =
  /geschafft|erfolg|stolz|erreicht|meilenstein|abgenommen|gewonnen|achievement|fortschritt|dran geblieben|durchgehalten|progress/i;
const NEGATION_RE = /\b(nicht|kein|keine|keinen|keinem|keiner|nie|niemals)\b/i;

const MOTIVATION_RULES: Array<{ key: string; test: (text: string) => boolean }> = [
  { key: "motivationQuestion", test: (t) => t.trim().endsWith("?") },
  { key: "motivationChallenge", test: (t) => /challenge|herausforderung/i.test(t) },
  {
    key: "motivationEmotional",
    test: (t) =>
      (POSITIVE_STEM_RE.test(t) && NEGATION_RE.test(t)) || /erfolglos|gescheitert|misslungen|vergeblich/i.test(t),
  },
  {
    key: "motivationAchievement",
    test: (t) => /geschafft|erfolg|stolz|erreicht|meilenstein|abgenommen|gewonnen|achievement/i.test(t),
  },
  {
    key: "motivationProgress",
    test: (t) => /fortschritt|\btag \d+\b|\bwoche \d+\b|dran geblieben|durchgehalten|progress/i.test(t),
  },
  { key: "motivationDance", test: (t) => /tanz|dance/i.test(t) },
  {
    key: "motivationWorkout",
    test: (t) => /workout|training|\bsport\b|fitness|joggen|laufen|\bgym\b|yoga|pilates|krafttraining|hiit/i.test(t),
  },
  {
    key: "motivationMeal",
    test: (t) => /rezept|ernährung|kochen|smoothie|frühstück|mittagessen|abendessen|gesundes essen|healthy meal/i.test(t),
  },
  { key: "motivationRelax", test: (t) => /entspann|\bruhe\b|\bpause\b|meditation|erholung|auszeit|relax/i.test(t) },
  {
    key: "motivationTravelNature",
    test: (t) =>
      /sonnenuntergang|sunset|\breise\b|urlaub|strand|\bbeach\b|\bmeer\b|berge|\bnatur\b|landschaft|ferien|wandern/i.test(
        t,
      ),
  },
  { key: "motivationEvent", test: (t) => /\bevent\b|veranstaltung|\btreffen\b|meetup|konzert|\bfeier\b/i.test(t) },
  { key: "motivationEducational", test: (t) => /wusstest du|studie zeigt|tipp des tages|neu gelernt/i.test(t) },
  { key: "motivationEmotional", test: (t) => /verlust|trauer|schwer gefallen|kämpf|dankbar für/i.test(t) },
];

/**
 * Personalized motivational-impulse key for a community post — replaces the
 * old "from the community" / "from someone you follow" provenance label,
 * which described where the post came from instead of inviting the viewer
 * to do something with it.
 */
export function motivationKeyFor(item: PostFeedItem): string {
  const text = item.content ?? "";
  for (const rule of MOTIVATION_RULES) {
    if (rule.test(text)) return `screens.home.${rule.key}`;
  }
  if (item.followed) return "screens.home.motivationFollowed";
  if (item.image_url) return "screens.home.motivationGreeting";
  if (item.video_url) return "screens.home.motivationWorkout";
  return "screens.home.motivationDefault";
}

/** The "why you're seeing this" reason key for a feed item (i18n lookup key). */
export function reasonKeyFor(item: FeedItem): string {
  switch (item.kind) {
    case "match":
      return "screens.home.whyMatch";
    case "performer":
      return "screens.home.whySpotlight";
    case "post":
      return motivationKeyFor(item);
    case "article":
      return "screens.home.whyPublic";
    case "feature_announcement":
      return item.variant === "brand-new-feature"
        ? "featureAnnouncementCard.brandNew.eyebrow"
        : "featureAnnouncementCard.didYouKnow.eyebrow";
  }
}
