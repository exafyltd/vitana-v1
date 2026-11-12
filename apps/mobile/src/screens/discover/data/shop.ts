/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — native twins of
 * `src/hooks/useShopFeed.ts` over `src/lib/shop-feed-client.ts` (class B: the
 * community gateway). Same gateway rail, query keys (generated into
 * `@vitana/core/discover`), retry rules and telemetry batching:
 *
 *   GET  /shop-feed/videos?cursor&limit        useShopFeed (cursor paging)
 *   GET  /shop-feed/videos/:id/anchor          useShopVideoAnchor (live price / stock, staleTime 0)
 *   POST /shop-feed/videos/:id/events          non-batched view-funnel events
 *   POST /shop-feed/events/batch { events }    impression / hold_2s, flushed every 5 s, at 25, on unmount
 *
 * Telemetry is fire-and-forget: a failed beacon never reaches the UI.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { BATCHED_TYPES, FLUSH_INTERVAL_MS, MAX_BATCH, shopFeedQueryKeys } from '../../../ports/discover';
import { ShopFeedApiError, shopJson } from './client';

export { ShopFeedApiError };

export interface ShopProduct {
  id: string;
  title: string | null;
  price_cents: number | null;
  currency: string | null;
  compare_at_price_cents: number | null;
  images: string[];
  affiliate_url: string | null;
  availability: string;
  in_stock: boolean;
  rating: number | null;
  review_count: number | null;
  merchant_id: string | null;
  [key: string]: unknown;
}

export interface ShopAnchor {
  id: string;
  label: string;
  appear_at_ms: number;
  pos_x: number;
  pos_y: number;
  badge_price_cents: number | null;
  currency: string | null;
  product: ShopProduct;
}

export interface VideoItem {
  id: string;
  title: string | null;
  caption: string | null;
  creator_id: string | null;
  playback: { video_url: string; poster_url: string | null; thumbnail_url: string | null; duration_ms: number; aspect_ratio: string };
  primary_anchor: ShopAnchor | null;
}

export interface ShopFeedResponse {
  ok: true;
  videos: VideoItem[];
  next_cursor: string | null;
}

export interface ShopAnchorLive {
  id: string;
  label: string;
  badge_price_cents: number | null;
  currency: string | null;
  product: ShopProduct;
}

export type ShopEventType =
  | 'impression'
  | 'hold_2s'
  | 'anchor_tap'
  | 'drawer_open'
  | 'drawer_expand'
  | 'pdp_view'
  | 'variant_change'
  | 'add_to_cart'
  | 'buy_now'
  | 'checkout_start'
  | 'purchase'
  | 'save'
  | 'unsave'
  | 'share'
  | 'drawer_close';

export interface ShopEventInput {
  type: ShopEventType;
  session_id: string;
  anchor_id?: string;
  product_id?: string;
  dwell_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface ShopBatchEventInput extends ShopEventInput {
  video_id: string;
}

export function getShopFeed(params: { cursor?: string | null; limit?: number } = {}): Promise<ShopFeedResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return shopJson<ShopFeedResponse>(`/shop-feed/videos${q ? `?${q}` : ''}`, { method: 'GET' });
}

export const getShopVideoAnchor = (videoId: string) =>
  shopJson<{ ok: true; anchor: ShopAnchorLive }>(`/shop-feed/videos/${encodeURIComponent(videoId)}/anchor`, { method: 'GET' });

export const postShopVideoEvent = (videoId: string, event: ShopEventInput) =>
  shopJson<{ ok: true }>(`/shop-feed/videos/${encodeURIComponent(videoId)}/events`, { method: 'POST', body: event });

export const postShopEventBatch = (events: ShopBatchEventInput[]) => shopJson<{ ok: true }>('/shop-feed/events/batch', { method: 'POST', body: { events } });

export function useShopFeed(opts?: { limit?: number; enabled?: boolean }) {
  const limit = opts?.limit ?? 10;
  const query = useInfiniteQuery<ShopFeedResponse>({
    queryKey: shopFeedQueryKeys.feed(limit),
    queryFn: ({ pageParam }) => getShopFeed({ cursor: pageParam as string | null, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: opts?.enabled ?? true,
    retry: (failureCount, error) => {
      if (error instanceof ShopFeedApiError && (error.status === 401 || error.status === 403)) return false;
      return failureCount < 1;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const videos = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.videos), [query.data]);
  const roleBlocked = query.error instanceof ShopFeedApiError && (query.error.status === 403 || query.error.code === 'cart_unavailable_for_role');
  return {
    videos,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    error: query.error,
    roleBlocked,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    refresh: async () => {
      await query.refetch();
    },
  };
}

export function useShopVideoAnchor(videoId: string | null, opts?: { enabled?: boolean }) {
  const query = useQuery<{ ok: true; anchor: ShopAnchorLive }>({
    queryKey: shopFeedQueryKeys.anchor(videoId ?? ''),
    queryFn: () => getShopVideoAnchor(videoId as string),
    enabled: !!videoId && (opts?.enabled ?? true),
    retry: (failureCount, error) => {
      if (error instanceof ShopFeedApiError) {
        if (error.status === 404 || error.code === 'anchor_unavailable') return false;
        if (error.status === 401 || error.status === 403) return false;
      }
      return failureCount < 1;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const unavailable = query.error instanceof ShopFeedApiError && (query.error.status === 404 || query.error.code === 'anchor_unavailable');
  return {
    anchor: query.data?.anchor ?? null,
    isLoading: query.isLoading,
    unavailable,
    error: unavailable ? null : query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
}

function makeSessionId(): string {
  try {
    return randomUUID();
  } catch {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }
}

export function useShopEvents() {
  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = makeSessionId();
  const bufferRef = useRef<ShopBatchEventInput[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = bufferRef.current;
    if (pending.length === 0) return;
    bufferRef.current = [];
    postShopEventBatch(pending).catch(() => undefined);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  const emit = useCallback(
    (videoId: string, event: Omit<ShopEventInput, 'session_id'> & { session_id?: string }) => {
      const session_id = event.session_id ?? sessionIdRef.current;
      if (BATCHED_TYPES.has(event.type)) {
        bufferRef.current.push({ ...event, session_id, video_id: videoId });
        if (bufferRef.current.length >= MAX_BATCH) flush();
        else scheduleFlush();
        return;
      }
      postShopVideoEvent(videoId, { ...event, session_id }).catch(() => undefined);
    },
    [flush, scheduleFlush],
  );

  useEffect(() => () => flush(), [flush]);

  return { emit, flush, sessionId: sessionIdRef.current };
}
