/**
 * VTID-03319 — unified "All News" feed hook.
 *
 * Hybrid architecture: every candidate source except the consent-gated
 * spotlight is loaded directly from Supabase under RLS (posts, approved public
 * videos, follows, matches) or from the existing public-news gateway endpoint.
 * The one read that needs server-side trust — the opt-in "most improved"
 * spotlight, which crosses user boundaries and the Vitana Index — comes from a
 * single narrow gateway endpoint and degrades to nothing when unavailable.
 *
 * Raw candidates are cached by react-query; the deterministic ordering (and the
 * user's hide/mute/"show less" preferences) is applied in a useMemo so toggling
 * a preference re-ranks instantly without a refetch.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { persistQueryCacheNow } from "@/lib/query-persist";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n-toast";
import { useRealMatches } from "@/hooks/useRealMatches";
import { useNewsFeedPreferencesStore } from "@/stores/newsFeedPreferencesStore";
import { useLongevityNewsFeed } from "@/hooks/useNewsFeed";
import { FEED_INCLUDE_OWN_POSTS, FEED_FOLLOWING_ONLY } from "@/config/feed";
import {
  rankFeed,
  type FeedItem,
  type PostFeedItem,
  type PostMention,
  type ArticleFeedItem,
  type PerformerFeedItem,
  type MatchFeedItem,
  type FeatureAnnouncementFeedItem,
} from "@/lib/news-feed-ranker";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

interface RawCandidates {
  posts: PostFeedItem[];
  performer: PerformerFeedItem | null;
  featureAnnouncements: RawFeatureAnnouncementRow[];
}

interface RawFeatureAnnouncementRow {
  id: string;
  variant: "brand-new-feature" | "did-you-know-feature";
  feature_title: Record<string, string>;
  description: Record<string, string>;
  deep_link: string;
  created_at: string;
}

interface RawPostRow {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  background_style: string | null;
  mentions: PostMention[] | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
}

interface RawMediaRow {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  file_url: string | null;
  tags: string[] | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
}

interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
}

async function fetchAuthors(userIds: string[]): Promise<Map<string, AuthorProfile>> {
  const map = new Map<string, AuthorProfile>();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return map;
  const { data } = await supabase
    .from("global_community_profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", unique);
  for (const row of data || []) {
    map.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url });
  }
  return map;
}

/** The consent-gated spotlight. Returns null on any failure — the feed simply omits it. */
async function fetchTopPerformer(token: string | null): Promise<PerformerFeedItem | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/news-feed/top-performer`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // The whole candidates load waits on this group, so an unbounded fetch
      // here means one slow/hanging gateway response holds the ENTIRE feed
      // pending — for a single optional card. The abort lands in the catch
      // below and yields null, which is exactly the documented degradation.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.performer) return null;
    const p = json.performer;
    return {
      id: `performer-${p.user_id}`,
      kind: "performer",
      user_id: p.user_id,
      display_name: p.display_name || t("screens.home.communityMember"),
      avatar_url: p.avatar_url ?? null,
      improvement: Number(p.improvement) || 0,
      published_at: p.computed_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchNewsFeedCandidates(
  userId: string | null,
  token: string | null,
): Promise<RawCandidates> {
  // ONE round trip for every independent read.
  //
  // This used to be two sequential waves — the viewer-scoped filter sets
  // (follows / hidden / muted / blocked) were awaited BEFORE the content reads
  // (posts / media / spotlight / announcements) were even issued. The filter
  // sets are only consumed after both groups resolve, so that ordering bought
  // nothing and cost a full extra network round trip on every single load.
  // On mobile that was several hundred ms of pure dead time before the first
  // byte of actual feed content was requested. Issue everything at once.
  // Both groups are STARTED here (no await yet) so they are in flight together,
  // then awaited as one. Tuple typing is preserved because each group keeps its
  // own Promise.allSettled call.
  const viewerScopedPromise = userId
    ? Promise.allSettled([
        supabase.from("user_follows").select("following_id").eq("follower_id", userId),
        supabase.from("user_hidden_posts" as never).select("post_id").eq("user_id", userId),
        supabase.from("user_muted_authors" as never).select("author_id").eq("user_id", userId),
        supabase.from("user_blocked_authors" as never).select("author_id").eq("user_id", userId),
      ])
    : null;

  const contentPromise = Promise.allSettled([
    // Public member posts.
    supabase
      .from("profile_posts" as never)
      .select("*")
      .eq("is_public", true)
      .eq("moderation_status", "active") // hide removed/hidden posts + banned authors' posts
      .order("created_at", { ascending: false })
      .limit(40),
    // Approved, public community videos.
    supabase
      .from("media_uploads")
      .select("id, user_id, title, description, media_type, file_url, thumbnail_url, status, is_public, created_at, tags, likes_count, comments_count")
      .eq("status", "approved")
      .eq("is_public", true)
      .eq("media_type", "video")
      .order("created_at", { ascending: false })
      .limit(20),
    // Consent-gated spotlight (gateway).
    fetchTopPerformer(token),
    // Admin-published "Brand New Feature" / "Did You Know" cards (RLS-scoped
    // to the caller's own tenant via user_tenants — see DATABASE_SCHEMA.md
    // BOOTSTRAP-FEATURE-ANNOUNCEMENTS). Never fails the whole feed if absent.
    supabase
      .from("feature_announcements" as never)
      .select("id, variant, feature_title, description, deep_link, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const [[postsRes, mediaRes, performer, featureAnnouncementsRes], viewerRes] =
    await Promise.all([contentPromise, viewerScopedPromise]);

  // Followed ids (for the follow-before-others ranking tier).
  const followingIds = new Set<string>();
  // Personal, viewer-scoped safety filters (VTID-03319 Phase 2): posts the user
  // hid, and authors they muted or blocked. These only affect this user's feed.
  const hiddenPostIds = new Set<string>();
  const suppressedAuthorIds = new Set<string>();
  if (viewerRes) {
    const [followsRes, hiddenRes, mutedRes, blockedRes] = viewerRes;
    if (followsRes.status === "fulfilled")
      for (const f of (followsRes.value.data as { following_id: string }[]) || []) followingIds.add(f.following_id);
    if (hiddenRes.status === "fulfilled")
      for (const r of (hiddenRes.value.data as { post_id: string }[]) || []) hiddenPostIds.add(r.post_id);
    if (mutedRes.status === "fulfilled")
      for (const r of (mutedRes.value.data as { author_id: string }[]) || []) suppressedAuthorIds.add(r.author_id);
    if (blockedRes.status === "fulfilled")
      for (const r of (blockedRes.value.data as { author_id: string }[]) || []) suppressedAuthorIds.add(r.author_id);
  }

  const postRows: RawPostRow[] =
    postsRes.status === "fulfilled" ? ((postsRes.value.data as unknown as RawPostRow[]) || []) : [];
  const mediaRows: RawMediaRow[] =
    mediaRes.status === "fulfilled" ? ((mediaRes.value.data as unknown as RawMediaRow[]) || []) : [];
  const featureAnnouncementRows: RawFeatureAnnouncementRow[] =
    featureAnnouncementsRes.status === "fulfilled"
      ? ((featureAnnouncementsRes.value.data as unknown as RawFeatureAnnouncementRow[]) || [])
      : [];

  // Resolve authors for both posts and videos in one query.
  const authorIds = [
    ...postRows.map((p) => p.user_id),
    ...mediaRows.map((m) => m.user_id),
  ];
  const authors = await fetchAuthors(authorIds);

  const posts: PostFeedItem[] = [];

  for (const p of postRows) {
    const isOwn = !!userId && p.user_id === userId;
    if (hiddenPostIds.has(p.id)) continue; // user hid this post
    if (!isOwn && suppressedAuthorIds.has(p.user_id)) continue; // muted/blocked author
    if (isOwn && !FEED_INCLUDE_OWN_POSTS) continue; // launch mode keeps own posts
    if (FEED_FOLLOWING_ONLY && !isOwn && !followingIds.has(p.user_id)) continue;
    const author = authors.get(p.user_id);
    posts.push({
      id: `post-${p.id}`,
      kind: "post",
      source: "post",
      post_id: p.id,
      user_id: p.user_id,
      author_name: author?.display_name || t("screens.home.communityMember"),
      author_avatar: author?.avatar_url ?? null,
      content: p.content ?? "",
      image_url: p.image_url ?? null,
      video_url: p.video_url ?? null,
      background_style: p.background_style ?? null,
      mentions: Array.isArray(p.mentions) ? p.mentions : [],
      likes_count: Number(p.likes_count) || 0,
      comments_count: Number(p.comments_count) || 0,
      followed: followingIds.has(p.user_id),
      tags: [],
      published_at: p.created_at,
    });
  }

  for (const m of mediaRows) {
    const isOwn = !!userId && m.user_id === userId;
    if (hiddenPostIds.has(m.id)) continue; // user hid this item
    if (!isOwn && suppressedAuthorIds.has(m.user_id)) continue; // muted/blocked author
    if (isOwn && !FEED_INCLUDE_OWN_POSTS) continue;
    if (FEED_FOLLOWING_ONLY && !isOwn && !followingIds.has(m.user_id)) continue;
    const author = authors.get(m.user_id);
    posts.push({
      id: `media-${m.id}`,
      kind: "post",
      source: "media",
      post_id: m.id,
      user_id: m.user_id,
      author_name: author?.display_name || t("screens.home.communityMember"),
      author_avatar: author?.avatar_url ?? null,
      content: m.title || m.description || "",
      image_url: m.thumbnail_url ?? null,
      video_url: m.file_url ?? null,
      background_style: null,
      mentions: [],
      likes_count: Number(m.likes_count) || 0,
      comments_count: Number(m.comments_count) || 0,
      followed: followingIds.has(m.user_id),
      tags: Array.isArray(m.tags) ? m.tags : [],
      published_at: m.created_at,
    });
  }

  return {
    posts,
    performer: performer.status === "fulfilled" ? performer.value : null,
    featureAnnouncements: featureAnnouncementRows,
  };
}

/**
 * Cache key for the raw feed candidates. Exported so the post-login warmup and
 * the app-level keep-alive bind to the EXACT same entry the screen reads.
 */
export const allNewsFeedKey = (userId: string | null, language: string) =>
  ["all-news-feed", userId, language] as const;

/**
 * Apply a viewer's own like/comment to the cached feed counts (VTID-03503).
 *
 * `likes_count` / `comments_count` are read once, with the post row, and then
 * held for FEED_CANDIDATES_STALE_TIME (5 min) — and this entry is persisted to
 * localStorage, so it also survives a reload. Nothing in the interaction path
 * used to touch it: a user could like a post, refresh, and be shown the count
 * from before her own tap, which reads exactly like the like was discarded.
 * This delta patch is applied instantly, without waiting on the realtime round
 * trip below — realtime is what carries the same correction to every OTHER
 * viewer of this post.
 *
 * Patching the cache (rather than invalidating it) is deliberate: invalidation
 * would re-run the whole multi-request candidate load on every heart tap, and
 * the counts are authored by DB triggers that have already committed. The next
 * natural refetch reconciles.
 *
 * Ordering is not affected — engagement is only a tiebreak *below*
 * published_at in rankFeed, and posts have distinct timestamps.
 */
export function applyFeedEngagementDelta(
  queryClient: QueryClient,
  target: { source: PostFeedItem["source"]; postId: string; likes?: number; comments?: number },
): void {
  queryClient.setQueriesData<RawCandidates>(
    { queryKey: ["all-news-feed"] },
    (prev) => {
      if (!prev?.posts) return prev;
      let changed = false;
      const posts = prev.posts.map((p) => {
        if (p.source !== target.source || p.post_id !== target.postId) return p;
        changed = true;
        return {
          ...p,
          likes_count: Math.max(0, p.likes_count + (target.likes ?? 0)),
          comments_count: Math.max(0, p.comments_count + (target.comments ?? 0)),
        };
      });
      return changed ? { ...prev, posts } : prev;
    },
  );

  // The interval-based writer is up to 30s behind; a refresh inside that window
  // would restore the pre-interaction snapshot and undo the patch above.
  persistQueryCacheNow();
}

/**
 * Shared cache policy for the feed candidates.
 *
 * Previously: staleTime 15s + refetchOnWindowFocus + a 60s poll. That made the
 * News screen re-run its whole multi-request load on essentially EVERY return
 * from another screen (Messenger, Events, …) — 15 seconds away was enough — so
 * the feed visibly reloaded and felt slow every single time.
 *
 * Now: the feed is treated as durable, cache-first data. Freshness comes from
 * the realtime subscription below (which fires the instant a post/video lands)
 * plus the app-level keep-alive that holds the query active for the whole
 * session, so navigating back is a pure cache read with no network wait and no
 * spinner. The long gcTime is what stops a long detour into Messenger from
 * evicting the feed and forcing a cold reload.
 */
export const FEED_CANDIDATES_STALE_TIME = 5 * 60 * 1000;
export const FEED_CANDIDATES_GC_TIME = 60 * 60 * 1000;

/**
 * ONE realtime channel per app session, shared by every observer of the feed.
 *
 * Each mount of this hook used to open its own `all-news-feed-live` channel and
 * tear it down on unmount, so every navigation to and from the News screen
 * re-negotiated a websocket subscription — pure latency on a screen that is
 * supposed to already be loaded. Listeners are refcounted; the channel is
 * opened on the first and closed only when the last one goes away (which, with
 * the keep-alive mounted, is logout — not navigation).
 *
 * UPDATEs on profile_posts / media_uploads fire on every like or comment too
 * (the sync_post_likes_count / sync_post_comments_count / sync_media_upload_*
 * triggers write likes_count / comments_count onto the parent row), which is
 * why those tables carry REPLICA IDENTITY FULL. Until now only media_uploads
 * was subscribed to UPDATE at all, and even that collapsed every UPDATE — a
 * count tick or a real status change — into the same full feed-candidates
 * refetch. profile_posts had no UPDATE subscription whatsoever, so someone
 * else's like or comment on a post never reached any other viewer's counter;
 * it only self-corrected once that viewer's own 5-minute cache staleTime
 * lapsed. A row update is classified by diffing payload.old vs payload.new
 * (REPLICA IDENTITY FULL guarantees payload.old is populated): if only the
 * count columns moved, the new counts are patched straight into the cached
 * feed row (cheap, and mirrors applyFeedEngagementDelta's own-action patch
 * above); any other field changing (moderation_status, is_public, …) still
 * triggers the full refresh, since that can change which posts belong in the
 * feed at all.
 */
type FeedRealtimeEvent =
  | { kind: "refresh" }
  | {
      kind: "counts";
      source: PostFeedItem["source"];
      postId: string;
      likesCount: number;
      commentsCount: number;
    };

const feedRefreshListeners = new Set<(event: FeedRealtimeEvent) => void>();
let feedChannel: ReturnType<typeof supabase.channel> | null = null;

/** True when some field besides the trigger-maintained counts (or updated_at) changed. */
export function rowChangedBeyondCounts(
  oldRow: Record<string, unknown> | null | undefined,
  newRow: Record<string, unknown>,
): boolean {
  if (!oldRow) return true;
  return Object.keys(newRow).some((key) => {
    if (key === "likes_count" || key === "comments_count" || key === "updated_at") return false;
    return newRow[key] !== oldRow[key];
  });
}

function subscribeToFeedRealtime(listener: (event: FeedRealtimeEvent) => void): () => void {
  feedRefreshListeners.add(listener);
  if (!feedChannel) {
    const emit = (event: FeedRealtimeEvent) => {
      for (const l of [...feedRefreshListeners]) l(event);
    };
    const fire = () => emit({ kind: "refresh" });
    const handleCountsRow =
      (source: PostFeedItem["source"]) =>
      (payload: RealtimePostgresUpdatePayload<Record<string, unknown>>) => {
        const newRow = payload.new;
        const postId = newRow?.id as string | undefined;
        if (!postId) return;
        if (rowChangedBeyondCounts(payload.old, newRow)) {
          emit({ kind: "refresh" });
          return;
        }
        emit({
          kind: "counts",
          source,
          postId,
          likesCount: Number(newRow.likes_count) || 0,
          commentsCount: Number(newRow.comments_count) || 0,
        });
      };
    feedChannel = supabase
      .channel("all-news-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profile_posts" }, fire)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profile_posts" }, handleCountsRow("post"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "media_uploads" }, fire)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "media_uploads" }, handleCountsRow("media"))
      .subscribe();
  }
  return () => {
    feedRefreshListeners.delete(listener);
    if (feedRefreshListeners.size === 0 && feedChannel) {
      supabase.removeChannel(feedChannel);
      feedChannel = null;
    }
  };
}

/**
 * Keeps the feed cache fresh via realtime. Used by both the screen and the
 * app-level keep-alive; only one underlying channel exists either way.
 */
export function useFeedRealtimeRefresh(enabled: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    return subscribeToFeedRealtime((event) => {
      if (event.kind === "refresh") {
        // Invalidate every user/language variant — the caller's own entry is
        // the only active one, and this avoids threading ids through the
        // listener.
        queryClient.invalidateQueries({ queryKey: ["all-news-feed"] });
        return;
      }
      // Count-only change: patch in place rather than refetching, same
      // reasoning as applyFeedEngagementDelta — the counts are already
      // authoritative (they came from the DB row itself).
      queryClient.setQueriesData<RawCandidates>({ queryKey: ["all-news-feed"] }, (prev) => {
        if (!prev?.posts) return prev;
        let changed = false;
        const posts = prev.posts.map((p) => {
          if (p.source !== event.source || p.post_id !== event.postId) return p;
          if (p.likes_count === event.likesCount && p.comments_count === event.commentsCount) return p;
          changed = true;
          return { ...p, likes_count: event.likesCount, comments_count: event.commentsCount };
        });
        return changed ? { ...prev, posts } : prev;
      });
    });
  }, [queryClient, enabled]);
}

export function useAllNewsFeed(options?: { enabled?: boolean }) {
  const { session, user } = useAuth();
  const token = session?.access_token ?? null;
  const userId = user?.id ?? null;
  const { selectedLanguage } = useLanguage();
  const language = selectedLanguage?.split("-")[0] || "en";
  const enabled = options?.enabled !== false;

  // Gated: the decorative match card must not run its slow generate-daily-
  // matches edge function (plus one profile RPC per match) on screens/tabs
  // that never render it.
  const matchesQuery = useRealMatches(6, { enabled });

  const candidatesQuery = useQuery({
    queryKey: allNewsFeedKey(userId, language),
    queryFn: () => fetchNewsFeedCandidates(userId, token),
    enabled,
    staleTime: FEED_CANDIDATES_STALE_TIME,
    gcTime: FEED_CANDIDATES_GC_TIME,
    refetchOnWindowFocus: false,
  });

  // Public-source longevity news — paginated so the feed never "ends". As the
  // viewer scrolls, fetchNextPage() pulls the next page from the gateway and the
  // memo below re-ranks the larger article pool into the stream. Community posts
  // are finite and load once (above); the endless tail is public news.
  const newsQuery = useLongevityNewsFeed({ limit: 20, enabled: options?.enabled !== false });

  // Realtime: a new public post (or a freshly approved community video) should
  // surface in everyone's feed immediately. profile_posts/media_uploads are in
  // the supabase_realtime publication (see migration 20260620120000). Backed by
  // the shared, refcounted channel above so navigation no longer churns it.
  useFeedRealtimeRefresh(enabled);

  const hiddenArticleIds = useNewsFeedPreferencesStore((s) => s.hiddenArticleIds);
  const mutedSources = useNewsFeedPreferencesStore((s) => s.mutedSources);
  const downrankedTags = useNewsFeedPreferencesStore((s) => s.downrankedTags);

  // Gate the FIRST paint on the two CONTENT sources only (candidates +
  // longevity news). The single-fetch longevity-news query usually resolves
  // before the multi-round-trip candidates (user posts) query; painting
  // articles alone and re-ranking when posts arrived visibly shoved the
  // already-rendered feed around.
  //
  // Deliberately EXCLUDES matchesQuery: it's a single optional decorative
  // card (backed by a slow/flaky generate-daily-matches edge-function call)
  // that can legitimately re-enter isLoading on a remount without ever
  // having cached data. Including it here previously blanked the ENTIRE
  // feed (candidates + articles the user had already seen) back to a full
  // spinner on every revisit — a regression this fix introduced. Matches
  // always degraded gracefully by simply being absent from the rank before
  // this change; that's restored by leaving it out of the hold-gate.
  //
  // Cached revisits are unaffected: isLoading is false when data exists.
  const anySourcePending = candidatesQuery.isLoading || newsQuery.isLoading;
  const [firstPaintTimedOut, setFirstPaintTimedOut] = useState(false);
  useEffect(() => {
    if (!anySourcePending) {
      setFirstPaintTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setFirstPaintTimedOut(true), 6000);
    return () => window.clearTimeout(id);
  }, [anySourcePending]);
  const holdFirstPaint = anySourcePending && !firstPaintTimedOut;

  const items = useMemo<FeedItem[]>(() => {
    const candidates = candidatesQuery.data;
    const matchItems: MatchFeedItem[] = (matchesQuery.data || []).map((m) => ({
      id: `match-${m.user_id}`,
      kind: "match",
      user_id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
      match_reason: m.match_reason,
      compatibility_score: m.compatibility_score,
      published_at: new Date().toISOString(),
    }));

    // Flatten every loaded news page into article candidates. Newer pages just
    // grow this pool; rankFeed keeps the deterministic order stable.
    const articles: ArticleFeedItem[] = [];
    for (const page of newsQuery.data?.pages || []) {
      for (const item of page.items || []) {
        articles.push({
          id: `article-${item.id}`,
          kind: "article",
          source_name: item.source_name,
          title: item.title,
          summary: item.summary,
          image_url: item.image_url,
          link: item.link,
          tags: item.tags || [],
          published_at: item.published_at,
        });
      }
    }

    // Admin-published "Brand New Feature" / "Did You Know" cards — real rows
    // from feature_announcements (RLS-scoped to the caller's tenant, and
    // further to specific recipients when the admin targeted a test send —
    // see BOOTSTRAP-FEATURE-ANNOUNCEMENTS). Picks the viewer's language,
    // falling back to English if a translation is missing.
    const featureAnnouncements: FeatureAnnouncementFeedItem[] = (candidates?.featureAnnouncements || []).map(
      (row) => ({
        id: `feature-announcement-${row.id}`,
        kind: "feature_announcement",
        variant: row.variant,
        feature_title: row.feature_title[language] ?? row.feature_title.en,
        description: row.description[language] ?? row.description.en,
        deep_link: row.deep_link,
        published_at: row.created_at,
      }),
    );

    const all: FeedItem[] = [
      ...matchItems,
      ...featureAnnouncements,
      ...(candidates?.performer ? [candidates.performer] : []),
      ...(candidates?.posts || []),
      ...articles,
    ];

    return rankFeed(all, {
      hiddenIds: hiddenArticleIds,
      mutedSources,
      downrankedTags,
    });
  }, [candidatesQuery.data, matchesQuery.data, newsQuery.data, hiddenArticleIds, mutedSources, downrankedTags, language]);

  return {
    // While the first paint is held back, expose an empty list + loading so
    // the consumer renders its spinner once, then the complete ranked feed.
    items: holdFirstPaint ? [] : items,
    // Deliberately EXCLUDES matchesQuery — same reasoning as the hold-gate
    // above. It is one optional decorative card behind a slow/flaky edge
    // function; letting it drive the screen's loading state made the whole
    // feed report "loading" (and the header's refresh icon spin) on revisits
    // where the actual content was already cached and rendered.
    isLoading: holdFirstPaint || candidatesQuery.isLoading,
    isError: candidatesQuery.isError,
    // Endless scroll: drive these from the consumer's intersection observer.
    fetchNextPage: newsQuery.fetchNextPage,
    hasNextPage: newsQuery.hasNextPage,
    isFetchingNextPage: newsQuery.isFetchingNextPage,
    refetch: () => {
      candidatesQuery.refetch();
      matchesQuery.refetch();
      newsQuery.refetch();
    },
  };
}
