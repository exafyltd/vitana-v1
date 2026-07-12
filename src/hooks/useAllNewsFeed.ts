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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";
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
} from "@/lib/news-feed-ranker";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

interface RawCandidates {
  posts: PostFeedItem[];
  performer: PerformerFeedItem | null;
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
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.performer) return null;
    const p = json.performer;
    return {
      id: `performer-${p.user_id}`,
      kind: "performer",
      user_id: p.user_id,
      display_name: p.display_name || "Community Member",
      avatar_url: p.avatar_url ?? null,
      improvement: Number(p.improvement) || 0,
      published_at: p.computed_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadCandidates(
  userId: string | null,
  token: string | null,
): Promise<RawCandidates> {
  // Followed ids (for the follow-before-others ranking tier).
  const followingIds = new Set<string>();
  // Personal, viewer-scoped safety filters (VTID-03319 Phase 2): posts the user
  // hid, and authors they muted or blocked. These only affect this user's feed.
  const hiddenPostIds = new Set<string>();
  const suppressedAuthorIds = new Set<string>();
  if (userId) {
    const [followsRes, hiddenRes, mutedRes, blockedRes] = await Promise.allSettled([
      supabase.from("user_follows").select("following_id").eq("follower_id", userId),
      supabase.from("user_hidden_posts" as never).select("post_id").eq("user_id", userId),
      supabase.from("user_muted_authors" as never).select("author_id").eq("user_id", userId),
      supabase.from("user_blocked_authors" as never).select("author_id").eq("user_id", userId),
    ]);
    if (followsRes.status === "fulfilled")
      for (const f of (followsRes.value.data as { following_id: string }[]) || []) followingIds.add(f.following_id);
    if (hiddenRes.status === "fulfilled")
      for (const r of (hiddenRes.value.data as { post_id: string }[]) || []) hiddenPostIds.add(r.post_id);
    if (mutedRes.status === "fulfilled")
      for (const r of (mutedRes.value.data as { author_id: string }[]) || []) suppressedAuthorIds.add(r.author_id);
    if (blockedRes.status === "fulfilled")
      for (const r of (blockedRes.value.data as { author_id: string }[]) || []) suppressedAuthorIds.add(r.author_id);
  }

  const [postsRes, mediaRes, performer] = await Promise.allSettled([
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
  ]);

  const postRows: RawPostRow[] =
    postsRes.status === "fulfilled" ? ((postsRes.value.data as unknown as RawPostRow[]) || []) : [];
  const mediaRows: RawMediaRow[] =
    mediaRes.status === "fulfilled" ? ((mediaRes.value.data as unknown as RawMediaRow[]) || []) : [];

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
      author_name: author?.display_name || "Community Member",
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
      author_name: author?.display_name || "Community Member",
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
  };
}

export function useAllNewsFeed(options?: { enabled?: boolean }) {
  const { session, user } = useAuth();
  const token = session?.access_token ?? null;
  const userId = user?.id ?? null;
  const { selectedLanguage } = useLanguage();
  const language = selectedLanguage?.split("-")[0] || "en";

  const matchesQuery = useRealMatches(6);
  const queryClient = useQueryClient();

  const candidatesQuery = useQuery({
    queryKey: ["all-news-feed", userId, language],
    queryFn: () => loadCandidates(userId, token),
    enabled: options?.enabled !== false,
    // Launch phase: keep the feed lively. Realtime (below) drives instant
    // updates; the short stale time + focus refetch + slow poll are belt-and-
    // suspenders so a new post never sits hidden for long even if a realtime
    // event is missed (e.g. flaky connection, tab restored from bfcache).
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

  // Public-source longevity news — paginated so the feed never "ends". As the
  // viewer scrolls, fetchNextPage() pulls the next page from the gateway and the
  // memo below re-ranks the larger article pool into the stream. Community posts
  // are finite and load once (above); the endless tail is public news.
  const newsQuery = useLongevityNewsFeed({ limit: 20, enabled: options?.enabled !== false });

  // Realtime: a new public post (or a freshly approved community video) should
  // surface in everyone's feed immediately. Invalidate the candidates query so
  // it refetches + re-ranks. profile_posts/media_uploads are in the
  // supabase_realtime publication (see migration 20260620120000).
  useEffect(() => {
    if (options?.enabled === false) return;
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ["all-news-feed", userId, language] });
    const channel = supabase
      .channel("all-news-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profile_posts" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "media_uploads" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "media_uploads" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId, language, options?.enabled]);

  const hiddenArticleIds = useNewsFeedPreferencesStore((s) => s.hiddenArticleIds);
  const mutedSources = useNewsFeedPreferencesStore((s) => s.mutedSources);
  const downrankedTags = useNewsFeedPreferencesStore((s) => s.downrankedTags);

  // Gate the FIRST paint on every contributing source. The single-fetch
  // longevity-news query usually resolves before the multi-round-trip
  // candidates (user posts) query; painting articles alone and re-ranking
  // when posts arrived visibly shoved the already-rendered feed around.
  // Hold the feed (spinner shows) until all sources have settled — errors
  // settle too, so a failed source never blocks — with a hard 6s cap so a
  // degraded network shows a partial feed instead of an endless spinner.
  // Cached revisits are unaffected: isLoading is false when data exists.
  const anySourcePending =
    candidatesQuery.isLoading || matchesQuery.isLoading || newsQuery.isLoading;
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

    const all: FeedItem[] = [
      ...matchItems,
      ...(candidates?.performer ? [candidates.performer] : []),
      ...(candidates?.posts || []),
      ...articles,
    ];

    return rankFeed(all, {
      hiddenIds: hiddenArticleIds,
      mutedSources,
      downrankedTags,
    });
  }, [candidatesQuery.data, matchesQuery.data, newsQuery.data, hiddenArticleIds, mutedSources, downrankedTags]);

  return {
    // While the first paint is held back, expose an empty list + loading so
    // the consumer renders its spinner once, then the complete ranked feed.
    items: holdFirstPaint ? [] : items,
    isLoading: holdFirstPaint || candidatesQuery.isLoading || matchesQuery.isLoading,
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
