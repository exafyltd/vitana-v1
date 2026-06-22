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
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRealMatches } from "@/hooks/useRealMatches";
import { useNewsFeedPreferencesStore } from "@/stores/newsFeedPreferencesStore";
import { fetchLongevityNews } from "@/hooks/useNewsFeed";
import { FEED_INCLUDE_OWN_POSTS, FEED_FOLLOWING_ONLY } from "@/config/feed";
import {
  rankFeed,
  type FeedItem,
  type PostFeedItem,
  type ArticleFeedItem,
  type PerformerFeedItem,
  type MatchFeedItem,
} from "@/lib/news-feed-ranker";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

interface RawCandidates {
  posts: PostFeedItem[];
  articles: ArticleFeedItem[];
  performer: PerformerFeedItem | null;
}

interface RawPostRow {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
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
  language: string,
): Promise<RawCandidates> {
  // Followed ids (for the follow-before-others ranking tier).
  const followingIds = new Set<string>();
  if (userId) {
    const { data: follows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);
    for (const f of follows || []) followingIds.add(f.following_id);
  }

  const [postsRes, mediaRes, newsRes, performer] = await Promise.allSettled([
    // Public member posts.
    supabase
      .from("profile_posts" as never)
      .select("*")
      .eq("is_public", true)
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
    // Public-source longevity news (page 1).
    fetchLongevityNews(1, token, { limit: 20, language }),
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
      likes_count: Number(p.likes_count) || 0,
      comments_count: Number(p.comments_count) || 0,
      followed: followingIds.has(p.user_id),
      tags: [],
      published_at: p.created_at,
    });
  }

  for (const m of mediaRows) {
    const isOwn = !!userId && m.user_id === userId;
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
      likes_count: Number(m.likes_count) || 0,
      comments_count: Number(m.comments_count) || 0,
      followed: followingIds.has(m.user_id),
      tags: Array.isArray(m.tags) ? m.tags : [],
      published_at: m.created_at,
    });
  }

  const articles: ArticleFeedItem[] = [];
  if (newsRes.status === "fulfilled") {
    for (const item of newsRes.value.items || []) {
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

  return {
    posts,
    articles,
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
    queryFn: () => loadCandidates(userId, token, language),
    enabled: options?.enabled !== false,
    // Launch phase: keep the feed lively. Realtime (below) drives instant
    // updates; the short stale time + focus refetch + slow poll are belt-and-
    // suspenders so a new post never sits hidden for long even if a realtime
    // event is missed (e.g. flaky connection, tab restored from bfcache).
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

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

    const all: FeedItem[] = [
      ...matchItems,
      ...(candidates?.performer ? [candidates.performer] : []),
      ...(candidates?.posts || []),
      ...(candidates?.articles || []),
    ];

    return rankFeed(all, {
      hiddenIds: hiddenArticleIds,
      mutedSources,
      downrankedTags,
    });
  }, [candidatesQuery.data, matchesQuery.data, hiddenArticleIds, mutedSources, downrankedTags]);

  return {
    items,
    isLoading: candidatesQuery.isLoading || matchesQuery.isLoading,
    isError: candidatesQuery.isError,
    refetch: () => {
      candidatesQuery.refetch();
      matchesQuery.refetch();
    },
  };
}
