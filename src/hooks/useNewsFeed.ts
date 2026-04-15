/**
 * VTID-01900: News Feed data hook
 *
 * Fetches paginated longevity news from the gateway API
 * and community news from Supabase, merging them into a single feed.
 */

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

// ── Types ────────────────────────────────────────────────────────

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

// ── Longevity News (RSS via Gateway API) ─────────────────────────

async function fetchLongevityNews(
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

  // Extract 2-letter code from locale (e.g., 'de-DE' → 'de', 'en-US' → 'en')
  const language = selectedLanguage?.split('-')[0] || 'en';

  return useInfiniteQuery({
    queryKey: ["longevity-news", options?.tag, options?.limit, language],
    queryFn: ({ pageParam = 1 }) =>
      fetchLongevityNews(pageParam, token, { ...options, language }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ── Community News (Events + Media + Members from Supabase) ──────

export function useCommunityNews(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 10;

  return useQuery({
    queryKey: ["community-news", limit],
    queryFn: async (): Promise<NewsArticle[]> => {
      const articles: NewsArticle[] = [];

      // 1. Recent community events
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

      // 2. Recent approved media uploads
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

      // 3. New member spotlights (recently joined)
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

      // Sort all community articles by date
      articles.sort(
        (a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );

      return articles;
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
