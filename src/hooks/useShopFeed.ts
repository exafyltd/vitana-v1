/**
 * Vitanaland Video Commerce — useShopFeed hooks.
 *
 * TanStack Query v5 hooks over the merged `/api/v1/shop-feed/*` rail (the
 * TikTok-style video-shop feed + single-product drawer). Mirrors the structure
 * of useWalletGateway / useUniversalCart: a centralized query-key object, typed
 * errors surfaced via `ShopFeedApiError`, and cursor paging like the existing
 * marketplace feed.
 *
 * Surfaces:
 *   - useShopFeed()          → cursor-paged vertical video feed
 *   - useShopVideoAnchor(id) → live (re-read price/stock) anchor for the drawer
 *   - useShopEvents()        → view-funnel emitter (single + batched
 *                              impression/hold telemetry; fire-and-forget)
 *
 * The view funnel is TELEMETRY, not OASIS — it is fire-and-forget; a failed
 * beacon never blocks the UI or surfaces an error toast.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ShopAnchorResponse,
  ShopBatchEventInput,
  ShopEventInput,
  ShopEventType,
  ShopFeedApiError,
  ShopFeedResponse,
  VideoItem,
  getShopFeed as apiGetShopFeed,
  getShopVideoAnchor as apiGetShopVideoAnchor,
  postShopEventBatch as apiPostShopEventBatch,
  postShopVideoEvent as apiPostShopVideoEvent,
} from "@/lib/shop-feed-client";

// Centralized React Query keys so other code reads the same cache. Kept
// separate from cart / wallet keys so their invalidation never crosses over.
export const shopFeedQueryKeys = {
  all: ["shop-feed"] as const,
  feed: (limit?: number) =>
    [...shopFeedQueryKeys.all, "feed", limit ?? 10] as const,
  anchor: (videoId: string) =>
    [...shopFeedQueryKeys.all, "anchor", videoId] as const,
};

// =============================================================================
// Feed (cursor paging)
// =============================================================================

export interface UseShopFeedReturn {
  videos: VideoItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: unknown;
  /** 403 cart_unavailable_for_role / non-community role gate. */
  roleBlocked: boolean;
  fetchNextPage: () => void;
  refresh: () => Promise<void>;
}

/**
 * GET /api/v1/shop-feed/videos — cursor-paged vertical feed. Pages are flattened
 * into a single `videos` array, mirroring `useMarketplaceFeed` plus the
 * cursor-paging contract from the gateway (`next_cursor`).
 */
export function useShopFeed(opts?: {
  limit?: number;
  enabled?: boolean;
}): UseShopFeedReturn {
  const limit = opts?.limit ?? 10;

  const query = useInfiniteQuery<ShopFeedResponse>({
    queryKey: shopFeedQueryKeys.feed(limit),
    queryFn: ({ pageParam }) =>
      apiGetShopFeed({ cursor: pageParam as string | null, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: opts?.enabled ?? true,
    retry: (failureCount, error) => {
      if (
        error instanceof ShopFeedApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const videos = useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p.videos),
    [query.data],
  );

  const roleBlocked =
    query.error instanceof ShopFeedApiError &&
    (query.error.status === 403 ||
      query.error.code === "cart_unavailable_for_role");

  return {
    videos,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    error: query.error,
    roleBlocked,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    refresh: async () => {
      await query.refetch();
    },
  };
}

// =============================================================================
// Live anchor (drawer open)
// =============================================================================

export interface UseShopVideoAnchorReturn {
  anchor: ShopAnchorResponse["anchor"] | null;
  isLoading: boolean;
  /** 404 anchor_unavailable — the product is no longer buyable. */
  unavailable: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

/**
 * GET /api/v1/shop-feed/videos/:id/anchor — re-reads LIVE price/stock. Enabled
 * only while the drawer is open (pass `enabled`). 404 `anchor_unavailable` is
 * surfaced as `unavailable: true` rather than thrown so the drawer can render a
 * "no longer available" state.
 */
export function useShopVideoAnchor(
  videoId: string | null,
  opts?: { enabled?: boolean },
): UseShopVideoAnchorReturn {
  const query = useQuery<ShopAnchorResponse>({
    queryKey: shopFeedQueryKeys.anchor(videoId ?? ""),
    queryFn: () => apiGetShopVideoAnchor(videoId as string),
    enabled: !!videoId && (opts?.enabled ?? true),
    retry: (failureCount, error) => {
      if (error instanceof ShopFeedApiError) {
        if (error.status === 404 || error.code === "anchor_unavailable") {
          return false;
        }
        if (error.status === 401 || error.status === 403) return false;
      }
      return failureCount < 1;
    },
    staleTime: 0, // always re-read live price/stock on open
    refetchOnWindowFocus: false,
  });

  const unavailable =
    query.error instanceof ShopFeedApiError &&
    (query.error.status === 404 ||
      query.error.code === "anchor_unavailable");

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

// =============================================================================
// View-funnel events (telemetry — fire and forget)
// =============================================================================

/** High-frequency types that are batched to save battery. */
const BATCHED_TYPES: ReadonlySet<ShopEventType> = new Set<ShopEventType>([
  "impression",
  "hold_2s",
]);

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 25;

export interface UseShopEventsReturn {
  /**
   * Emit a single view-funnel event. High-frequency impression/hold events are
   * coalesced into a batch and flushed on an interval / unmount; everything else
   * (anchor_tap, drawer_open, add_to_cart, share, ...) posts immediately.
   * Fire-and-forget: failures are swallowed (telemetry must never block UI).
   */
  emit: (
    videoId: string,
    event: Omit<ShopEventInput, "session_id"> & { session_id?: string },
  ) => void;
  /** Force-flush any pending batched events (e.g. before navigating away). */
  flush: () => void;
  /** Stable per-mount session id (correlates a viewing session's events). */
  sessionId: string;
}

function makeSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

/**
 * View-funnel emitter. Batches IMPRESSION / HOLD; posts the rest immediately.
 * All sends are best-effort (telemetry → never throws to the caller).
 */
export function useShopEvents(): UseShopEventsReturn {
  const sessionIdRef = useRef<string>("");
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
    // Fire-and-forget: telemetry must never surface an error to the UI.
    apiPostShopEventBatch(pending).catch(() => {
      /* swallow — beacon best-effort */
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, FLUSH_INTERVAL_MS);
  }, [flush]);

  const emit = useCallback<UseShopEventsReturn["emit"]>(
    (videoId, event) => {
      const session_id = event.session_id ?? sessionIdRef.current;
      if (BATCHED_TYPES.has(event.type)) {
        bufferRef.current.push({ ...event, session_id, video_id: videoId });
        if (bufferRef.current.length >= MAX_BATCH) {
          flush();
        } else {
          scheduleFlush();
        }
        return;
      }
      // Immediate, fire-and-forget.
      apiPostShopVideoEvent(videoId, { ...event, session_id }).catch(() => {
        /* swallow — beacon best-effort */
      });
    },
    [flush, scheduleFlush],
  );

  // Flush on unmount so trailing impression/hold events are not lost.
  useEffect(() => () => flush(), [flush]);

  return { emit, flush, sessionId: sessionIdRef.current };
}
