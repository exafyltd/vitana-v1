/**
 * VTID-05297 (Native Wave 2, home-feed lane) — native twins of the web feed
 * data hooks (`src/hooks/useNewsFeed.ts`, `src/hooks/useAllNewsFeed.ts`). Same
 * PostgREST queries, same columns, same transforms, RE-IMPLEMENTED against the
 * injected native Supabase client (`getSupabase()`) and the native gateway
 * client (`gatewayGet`) — NOT imported from `@vitana/core` (both web hooks are
 * class B: they import `@/integrations/supabase/client` and `@/lib/gateway-base`).
 * The pure ranker (`rankFeed`) comes through the feed port. Follows
 * `apps/mobile/src/screens/community/data/groups.ts`.
 *
 * Deferred (documented in the FEAT findings, picked up by a later home FEAT):
 *  - Realtime: the web `useAllNewsFeed` keeps the feed fresh with a shared
 *    Supabase realtime channel + optimistic count patches. Omitted here; the
 *    native feed relies on staleTime + pull-to-refresh (`refetch`).
 *  - The decorative "match" card (`useRealMatches`, a slow generate-daily-
 *    matches edge function) is not merged in yet; `rankFeed` degrades
 *    gracefully with no match items, exactly as the web hold-gate intends.
 *  - `FEED_INCLUDE_OWN_POSTS` / `FEED_FOLLOWING_ONLY` mirror the web launch
 *    phase (`src/config/feed.ts` default `'global'`); the web reads a Vite env
 *    switch (`VITE_FEED_MODE`) the native app has no equivalent for yet.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { gatewayGet } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import {
  rankFeed,
  type FeedItem,
  type PostFeedItem,
  type PostMention,
  type ArticleFeedItem,
  type PerformerFeedItem,
  type FeatureAnnouncementFeedItem,
  type NewMemberFeedItem,
} from '../../../ports/feed';
import type { LongevityNewsResponse, NewsArticle } from '../types';

/** VTID-05206 — the new-member intro opt-in column (web `COMMUNITY_INTRO_COLUMN`). */
const COMMUNITY_INTRO_COLUMN = 'community_intro_opt_in' as const;

/** Launch-phase feed mode (web `src/config/feed.ts` default `'global'`). */
const FEED_INCLUDE_OWN_POSTS = true;
const FEED_FOLLOWING_ONLY = false;

/**
 * Native twin of web `fetchGreetedMemberIds` (`src/lib/new-member-greeted.ts`,
 * VTID-04590). Which new members has the viewer already greeted (sent a DM)?
 * Fails open: a query error leaves the cards visible.
 */
async function fetchGreetedMemberIds(viewerId: string | null, memberIds: string[]): Promise<Set<string>> {
  const greeted = new Set<string>();
  const ids = [...new Set(memberIds)].filter(Boolean);
  if (!viewerId || !ids.length) return greeted;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('receiver_id')
    .eq('sender_id', viewerId)
    .is('group_id', null)
    .in('receiver_id', ids)
    .limit(ids.length * 20);
  if (error) return greeted;
  for (const row of (data as { receiver_id: string | null }[] | null) ?? []) {
    if (row.receiver_id) greeted.add(row.receiver_id);
  }
  return greeted;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Native twin of the pure part of web `attachedRefOf` (`src/lib/post-attachment.ts`,
 * VTID-04916). That module is class B (it also loads events via supabase), so
 * only the row-reading transform is mirrored here — the card's event lookup is
 * a later FEAT's concern. Returns the shared event ref id for rendering, never
 * fetches.
 */
export type PostAttachedRef =
  | { type: 'community_event' | 'live_room_session'; id: string }
  | { type: 'calendar_entry'; id: string };

function attachedRefOf(
  row: { attached_ref_type?: unknown; attached_ref_id?: unknown } | null | undefined,
): PostAttachedRef | null {
  if (!row) return null;
  const type = row.attached_ref_type;
  const id = row.attached_ref_id;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
  if (type === 'community_event' || type === 'live_room_session' || type === 'calendar_entry') return { type, id };
  return null;
}

// ─── Longevity news (gateway, paginated) ────────────────────────────────────

export const longevityNewsKey = (tag: string | undefined, limit: number | undefined, language: string) =>
  ['longevity-news', tag, limit, language] as const;

export async function fetchLongevityNews(
  page: number,
  options?: { tag?: string; limit?: number; language?: string },
): Promise<LongevityNewsResponse> {
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (options?.tag) params.set('tag', options.tag);
  if (options?.language) params.set('language', options.language);
  // The native gateway client injects the Supabase access token (I-N1.2),
  // mirroring the web hook's `Authorization: Bearer <token>` header.
  return gatewayGet<LongevityNewsResponse>(`/longevity-news/items?${params}`);
}

/** Native twin of web `useLongevityNewsFeed`. */
export function useLongevityNewsFeed(options?: { tag?: string; limit?: number; enabled?: boolean }) {
  const { locale } = useI18n();
  const language = locale;
  return useInfiniteQuery({
    queryKey: ['longevity-news', options?.tag, options?.limit, language],
    queryFn: ({ pageParam = 1 }) => fetchLongevityNews(pageParam, { ...options, language }),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    enabled: options?.enabled !== false,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ─── Community news (Supabase) ──────────────────────────────────────────────

export const communityNewsKey = (limit: number, viewerId?: string | null) =>
  ['community-news', limit, viewerId ?? null] as const;

/** Native twin of web `fetchCommunityNews` — events, media, new members and followed posts. */
export async function fetchCommunityNews(limit: number, viewerId?: string | null): Promise<NewsArticle[]> {
  const supabase = getSupabase();
  const articles: NewsArticle[] = [];

  const { data: events } = await supabase
    .from('global_community_events')
    .select('id, title, description, event_type, image_url, start_time, created_at')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(limit);
  for (const event of (events as Array<{
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    start_time: string | null;
    created_at: string;
  }> | null) ?? []) {
    articles.push({
      id: `event-${event.id}`,
      source: 'community',
      source_name: 'MAXINA Community',
      title: event.title,
      link: `/comm/events-meetups`,
      summary: event.description,
      image_url: event.image_url || null,
      published_at: event.start_time || event.created_at,
      tags: ['community_event'],
      category: 'community_event',
    });
  }

  const { data: media } = await supabase
    .from('media_uploads')
    .select('id, title, description, media_type, thumbnail_url, status, is_public, created_at')
    .eq('status', 'approved')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  for (const item of (media as Array<{
    id: string;
    title: string | null;
    description: string | null;
    thumbnail_url: string | null;
    created_at: string;
  }> | null) ?? []) {
    articles.push({
      id: `media-${item.id}`,
      source: 'community',
      source_name: 'MAXINA Community',
      title: item.title || 'New Media',
      link: `/comm/media-hub`,
      summary: item.description,
      image_url: item.thumbnail_url || null,
      published_at: item.created_at,
      tags: ['media'],
      category: 'media',
    });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: members } = await supabase
    .from('global_community_profiles')
    .select('id, user_id, display_name, avatar_url, bio, created_at')
    .eq('is_visible', true)
    .eq(COMMUNITY_INTRO_COLUMN, true)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false })
    .limit(5);
  const memberRows =
    (members as Array<{
      id: string;
      user_id: string | null;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      created_at: string;
    }> | null) ?? [];
  if (memberRows.length) {
    const greeted = await fetchGreetedMemberIds(
      viewerId ?? null,
      memberRows.map((m) => m.user_id).filter((id): id is string => !!id),
    );
    for (const member of memberRows) {
      if (member.user_id && greeted.has(member.user_id)) continue;
      const name = member.display_name?.trim().replace(/\s+/g, ' ') || 'New member';
      articles.push({
        id: `member-${member.id}`,
        source: 'community',
        source_name: 'MAXINA Community',
        title: name,
        link: member.user_id ? `/u/${member.user_id}` : null,
        member_user_id: member.user_id || null,
        member_display_name: member.display_name || null,
        summary: member.bio || null,
        image_url: member.avatar_url || null,
        published_at: member.created_at,
        tags: ['member_spotlight'],
        category: 'member_spotlight',
      });
    }
  }

  if (viewerId) {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId);
    const followingIds = ((follows as { following_id: string }[] | null) ?? [])
      .map((f) => f.following_id)
      .filter(Boolean);

    if (followingIds.length) {
      const { data: postRows } = await supabase
        .from('profile_posts' as never)
        .select('id, user_id, content, image_url, video_url, created_at')
        .eq('is_public', true)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
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
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', authorIds);
        const authorMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
        for (const a of (authorRows as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> | null) ?? []) {
          authorMap.set(a.user_id, { display_name: a.display_name, avatar_url: a.avatar_url });
        }
        for (const p of posts) {
          const author = authorMap.get(p.user_id);
          const name = author?.display_name || 'Community member';
          const content = (p.content || '').trim();
          articles.push({
            id: `post-${p.id}`,
            source: 'community',
            source_name: name,
            title: content || name,
            link: `/u/${p.user_id}`,
            summary: null,
            image_url: p.image_url || null,
            published_at: p.created_at,
            tags: ['community_post'],
            category: 'community_post',
          });
        }
      }
    }
  }

  articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return articles;
}

/** Native twin of web `useCommunityNews`. */
export function useCommunityNews(options?: { limit?: number; enabled?: boolean }) {
  const limit = options?.limit ?? 10;
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  return useQuery({
    queryKey: communityNewsKey(limit, viewerId),
    queryFn: () => fetchCommunityNews(limit, viewerId),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ─── Unified "All News" feed ─────────────────────────────────────────────────

interface RawFeatureAnnouncementRow {
  id: string;
  variant: 'brand-new-feature' | 'did-you-know-feature';
  feature_title: Record<string, string>;
  description: Record<string, string>;
  deep_link: string;
  created_at: string;
}

interface RawCandidates {
  posts: PostFeedItem[];
  newMembers: NewMemberFeedItem[];
  performer: PerformerFeedItem | null;
  featureAnnouncements: RawFeatureAnnouncementRow[];
}

interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
}

async function fetchAuthors(userIds: string[]): Promise<Map<string, AuthorProfile>> {
  const map = new Map<string, AuthorProfile>();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return map;
  const supabase = getSupabase();
  const { data } = await supabase
    .from('global_community_profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', unique);
  for (const row of (data as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> | null) ?? []) {
    map.set(row.user_id, { display_name: row.display_name, avatar_url: row.avatar_url });
  }
  return map;
}

/** The consent-gated spotlight (gateway). Null on any failure — the feed simply omits it. */
async function fetchTopPerformer(): Promise<PerformerFeedItem | null> {
  try {
    const json = await gatewayGet<{ ok?: boolean; performer?: Record<string, unknown> }>('/news-feed/top-performer');
    if (!json?.ok || !json?.performer) return null;
    const p = json.performer as {
      user_id: string;
      display_name?: string;
      avatar_url?: string | null;
      improvement?: unknown;
      computed_at?: string;
    };
    return {
      id: `performer-${p.user_id}`,
      kind: 'performer',
      user_id: p.user_id,
      display_name: p.display_name || 'Community member',
      avatar_url: p.avatar_url ?? null,
      improvement: Number(p.improvement) || 0,
      published_at: p.computed_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
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
  attached_ref_type?: string | null;
  attached_ref_id?: string | null;
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

export const allNewsFeedKey = (userId: string | null, language: string) =>
  ['all-news-feed', userId, language] as const;

/** Native twin of web `fetchNewsFeedCandidates` — posts, videos, spotlight, new members, feature cards. */
export async function fetchNewsFeedCandidates(userId: string | null): Promise<RawCandidates> {
  const supabase = getSupabase();

  const viewerScopedPromise = userId
    ? Promise.allSettled([
        supabase.from('user_follows').select('following_id').eq('follower_id', userId),
        supabase.from('user_hidden_posts' as never).select('post_id').eq('user_id', userId),
        supabase.from('user_muted_authors' as never).select('author_id').eq('user_id', userId),
        supabase.from('user_blocked_authors' as never).select('author_id').eq('user_id', userId),
      ])
    : null;

  const contentPromise = Promise.allSettled([
    supabase
      .from('profile_posts' as never)
      .select('*')
      .eq('is_public', true)
      .eq('moderation_status', 'active')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('media_uploads')
      .select('id, user_id, title, description, media_type, file_url, thumbnail_url, status, is_public, created_at, tags, likes_count, comments_count')
      .eq('status', 'approved')
      .eq('is_public', true)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(20),
    fetchTopPerformer(),
    supabase
      .from('feature_announcements' as never)
      .select('id, variant, feature_title, description, deep_link, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url, bio, created_at, community_intro_opt_in')
      .eq('is_visible', true)
      .eq(COMMUNITY_INTRO_COLUMN, true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const [[postsRes, mediaRes, performer, featureAnnouncementsRes, newMembersRes], viewerRes] = await Promise.all([
    contentPromise,
    viewerScopedPromise,
  ]);

  const followingIds = new Set<string>();
  const hiddenPostIds = new Set<string>();
  const suppressedAuthorIds = new Set<string>();
  if (viewerRes) {
    const [followsRes, hiddenRes, mutedRes, blockedRes] = viewerRes;
    if (followsRes.status === 'fulfilled') {
      for (const f of (followsRes.value.data as { following_id: string }[] | null) || []) followingIds.add(f.following_id);
    }
    if (hiddenRes.status === 'fulfilled') {
      for (const r of (hiddenRes.value.data as { post_id: string }[] | null) || []) hiddenPostIds.add(r.post_id);
    }
    if (mutedRes.status === 'fulfilled') {
      for (const r of (mutedRes.value.data as { author_id: string }[] | null) || []) suppressedAuthorIds.add(r.author_id);
    }
    if (blockedRes.status === 'fulfilled') {
      for (const r of (blockedRes.value.data as { author_id: string }[] | null) || []) suppressedAuthorIds.add(r.author_id);
    }
  }

  const newMembers: NewMemberFeedItem[] = [];
  if (newMembersRes.status === 'fulfilled') {
    const memberRows =
      (newMembersRes.value.data as Array<{
        user_id: string | null;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        created_at: string;
        community_intro_opt_in?: boolean | null;
      }> | null) || [];
    const greeted = await fetchGreetedMemberIds(
      userId,
      memberRows.map((m) => m.user_id).filter((id): id is string => !!id && id !== userId),
    );
    for (const m of memberRows) {
      if (!m.user_id || m.user_id === userId || suppressedAuthorIds.has(m.user_id) || greeted.has(m.user_id)) continue;
      if (m.community_intro_opt_in !== true) continue;
      newMembers.push({
        id: `new-member-${m.user_id}`,
        kind: 'new_member',
        user_id: m.user_id,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        bio: m.bio,
        published_at: m.created_at,
      });
    }
  }

  const postRows: RawPostRow[] = postsRes.status === 'fulfilled' ? ((postsRes.value.data as unknown as RawPostRow[]) || []) : [];
  const mediaRows: RawMediaRow[] = mediaRes.status === 'fulfilled' ? ((mediaRes.value.data as unknown as RawMediaRow[]) || []) : [];
  const featureAnnouncementRows: RawFeatureAnnouncementRow[] =
    featureAnnouncementsRes.status === 'fulfilled'
      ? ((featureAnnouncementsRes.value.data as unknown as RawFeatureAnnouncementRow[]) || [])
      : [];

  const authors = await fetchAuthors([...postRows.map((p) => p.user_id), ...mediaRows.map((m) => m.user_id)]);

  const posts: PostFeedItem[] = [];
  for (const p of postRows) {
    const isOwn = !!userId && p.user_id === userId;
    if (hiddenPostIds.has(p.id)) continue;
    if (!isOwn && suppressedAuthorIds.has(p.user_id)) continue;
    if (isOwn && !FEED_INCLUDE_OWN_POSTS) continue;
    if (FEED_FOLLOWING_ONLY && !isOwn && !followingIds.has(p.user_id)) continue;
    const author = authors.get(p.user_id);
    posts.push({
      id: `post-${p.id}`,
      kind: 'post',
      source: 'post',
      post_id: p.id,
      user_id: p.user_id,
      author_name: author?.display_name || 'Community member',
      author_avatar: author?.avatar_url ?? null,
      content: p.content ?? '',
      image_url: p.image_url ?? null,
      video_url: p.video_url ?? null,
      background_style: p.background_style ?? null,
      mentions: Array.isArray(p.mentions) ? p.mentions : [],
      likes_count: Number(p.likes_count) || 0,
      comments_count: Number(p.comments_count) || 0,
      followed: followingIds.has(p.user_id),
      tags: [],
      attached_ref: attachedRefOf(p),
      published_at: p.created_at,
    });
  }

  for (const m of mediaRows) {
    const isOwn = !!userId && m.user_id === userId;
    if (hiddenPostIds.has(m.id)) continue;
    if (!isOwn && suppressedAuthorIds.has(m.user_id)) continue;
    if (isOwn && !FEED_INCLUDE_OWN_POSTS) continue;
    if (FEED_FOLLOWING_ONLY && !isOwn && !followingIds.has(m.user_id)) continue;
    const author = authors.get(m.user_id);
    posts.push({
      id: `media-${m.id}`,
      kind: 'post',
      source: 'media',
      post_id: m.id,
      user_id: m.user_id,
      author_name: author?.display_name || 'Community member',
      author_avatar: author?.avatar_url ?? null,
      content: m.title || m.description || '',
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
    newMembers,
    performer: performer.status === 'fulfilled' ? performer.value : null,
    featureAnnouncements: featureAnnouncementRows,
  };
}

/**
 * Native twin of web `useAllNewsFeed`. Loads the candidates (Supabase + gateway)
 * and the paginated longevity news, maps the feature-announcement rows to the
 * viewer's locale, and ranks everything with the pure `rankFeed`. The web
 * decorative match card and realtime are deferred (see the file header).
 */
export function useAllNewsFeed(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { locale: language } = useI18n();
  const enabled = options?.enabled !== false;

  const candidatesQuery = useQuery({
    queryKey: allNewsFeedKey(userId, language),
    queryFn: () => fetchNewsFeedCandidates(userId),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const newsQuery = useLongevityNewsFeed({ limit: 20, enabled });

  const candidates = candidatesQuery.data;

  const articles: ArticleFeedItem[] = [];
  for (const page of newsQuery.data?.pages || []) {
    for (const item of page.items || []) {
      articles.push({
        id: `article-${item.id}`,
        kind: 'article',
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

  const featureAnnouncements: FeatureAnnouncementFeedItem[] = (candidates?.featureAnnouncements || []).map((row) => ({
    id: `feature-announcement-${row.id}`,
    kind: 'feature_announcement',
    variant: row.variant,
    feature_title: row.feature_title[language] ?? row.feature_title.en ?? row.feature_title.de,
    description: row.description[language] ?? row.description.en ?? row.description.de,
    deep_link: row.deep_link,
    published_at: row.created_at,
  }));

  const all: FeedItem[] = [
    ...featureAnnouncements,
    ...(candidates?.performer ? [candidates.performer] : []),
    ...(candidates?.posts || []),
    ...(candidates?.newMembers || []),
    ...articles,
  ];

  const items = rankFeed(all);

  return {
    items,
    isLoading: candidatesQuery.isLoading,
    isError: candidatesQuery.isError,
    fetchNextPage: newsQuery.fetchNextPage,
    hasNextPage: newsQuery.hasNextPage,
    isFetchingNextPage: newsQuery.isFetchingNextPage,
    refetch: () => {
      candidatesQuery.refetch();
      newsQuery.refetch();
    },
  };
}
