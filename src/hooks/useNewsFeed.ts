/**
 * VTID-01900: News Feed data hook
 *
 * Fetches paginated longevity news from the gateway API
 * and community news from Supabase, merging them into a single feed.
 * Automatically filters by user's preferred language.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n-toast";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

export interface NewsArticle {
  id: string;
  source: "longevity" | "community";
  source_name: string;
  title: string;
  link: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string;
  tags: string[];
  category: string;
}

interface LongevityNewsResponse {
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

// Key helper exported for the prefetch registry / warmup. Mirrors the hook's
// queryKey shape: ["longevity-news", tag, limit, language].
export const longevityNewsKey = (tag: string | undefined, limit: number | undefined, language: string) =>
  ["longevity-news", tag, limit, language] as const;

export async function fetchLongevityNews(
  page: number,
  token: string | null,
  options?: { tag?: string; limit?: number; language?: string }
): Promise<LongevityNewsResponse> {
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (options?.tag) params.set("tag", options.tag);
  if (options?.language) params.set("language", options.language);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${GATEWAY_URL}/longevity-news/items?${params}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  return response.json();
}

export function useLongevityNewsFeed(options?: {
  tag?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const { selectedLanguage } = useLanguage();

  // Extract 2-letter code from locale (e.g., 'de-DE' -> 'de', 'en-US' -> 'en')
  const language = selectedLanguage?.split('-')[0] || 'en';

  return useInfiniteQuery({
    queryKey: ["longevity-news", options?.tag, options?.limit, language],
    queryFn: ({ pageParam = 1 }) =>
      fetchLongevityNews(pageParam, token, { ...options, language }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    // Longer than the old 5min on purpose. A background refetch of an INFINITE
    // query re-fetches every page the user has scrolled through, sequentially —
    // so a reader who paged deep into the feed paid a long serial request chain
    // just for coming back to the screen. RSS-sourced articles do not change
    // minute to minute; 15min (plus the explicit refresh button and pull-to-
    // refresh) is ample, and keeps returning to the feed instant.
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Exported so the prefetch registry / post-login warmup can hydrate the exact
// same key+fetch the Home news feed binds to.
export const communityNewsKey = (limit: number, viewerId?: string | null) =>
  ["community-news", limit, viewerId ?? null] as const;

export async function fetchCommunityNews(
  limit: number,
  viewerId?: string | null,
): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  {
      const { data: events } = await supabase
        .from("global_community_events")
        .select("id, title, description, event_type, image_url, start_time, created_at")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(limit);

      if (events) {
        for (const event of events) {
          articles.push({
            id: `event-${event.id}`,
            source: "community",
            source_name: "MAXINA Community",
            title: event.title,
            link: `/comm/events-meetups`,
            summary: event.description,
            image_url: event.image_url || null,
            published_at: event.start_time || event.created_at,
            tags: ["community_event"],
            category: "community_event",
          });
        }
      }

      const { data: media } = await supabase
        .from("media_uploads")
        .select("id, title, description, media_type, thumbnail_url, status, is_public, created_at")
        .eq("status", "approved")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (media) {
        for (const item of media) {
          articles.push({
            id: `media-${item.id}`,
            source: "community",
            source_name: "MAXINA Community",
            title: item.title || "New Media",
            link: `/comm/media-hub`,
            summary: item.description,
            image_url: item.thumbnail_url || null,
            published_at: item.created_at,
            tags: ["media"],
            category: "media",
          });
        }
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: members } = await supabase
        .from("global_community_profiles")
        .select("id, display_name, avatar_url, bio, created_at")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if (members) {
        for (const member of members) {
          articles.push({
            id: `member-${member.id}`,
            source: "community",
            source_name: "MAXINA Community",
            title: `Welcome ${member.display_name || "New Member"}!`,
            link: null,
            summary: member.bio || `${member.display_name || "A new member"} just joined the MAXINA longevity community.`,
            image_url: member.avatar_url || null,
            published_at: member.created_at,
            tags: ["member_spotlight"],
            category: "member_spotlight",
          });
        }
      }

      // Free-form posts from people the viewer follows, so the Community tab
      // surfaces social posts — not just events, media and new-member
      // spotlights. Mirrors the post→author resolution used by useAllNewsFeed.
      if (viewerId) {
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", viewerId);

        const followingIds = (follows || [])
          .map((f) => f.following_id)
          .filter(Boolean);

        if (followingIds.length) {
          const { data: postRows } = await supabase
            .from("profile_posts" as never)
            .select("id, user_id, content, image_url, video_url, created_at")
            .eq("is_public", true)
            .in("user_id", followingIds)
            .order("created_at", { ascending: false })
            .limit(limit);

          const posts =
            (postRows as unknown as Array<{
              id: string;
              user_id: string;
              content: string | null;
              image_url: string | null;
              video_url: string | null;
              created_at: string;
            }>) || [];

          if (posts.length) {
            const authorIds = [...new Set(posts.map((p) => p.user_id))];
            const { data: authorRows } = await supabase
              .from("global_community_profiles")
              .select("user_id, display_name, avatar_url")
              .in("user_id", authorIds);

            const authorMap = new Map<
              string,
              { display_name: string | null; avatar_url: string | null }
            >();
            for (const a of authorRows || []) {
              authorMap.set(a.user_id, {
                display_name: a.display_name,
                avatar_url: a.avatar_url,
              });
            }

            for (const p of posts) {
              const author = authorMap.get(p.user_id);
              const name = author?.display_name || t("screens.home.communityMember");
              const content = (p.content || "").trim();
              articles.push({
                id: `post-${p.id}`,
                source: "community",
                source_name: name,
                title: content || name,
                link: `/u/${p.user_id}`,
                summary: null,
                image_url: p.image_url || null,
                published_at: p.created_at,
                tags: ["community_post"],
                category: "community_post",
              });
            }
          }
        }
      }

      articles.sort(
        (a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );

      return articles;
  }
}

export function useCommunityNews(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 10;
  const { session } = useAuth();
  const viewerId = session?.user?.id ?? null;

  return useQuery({
    queryKey: communityNewsKey(limit, viewerId),
    queryFn: () => fetchCommunityNews(limit, viewerId),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

