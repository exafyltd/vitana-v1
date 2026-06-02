/**
 * Vitanaland Video Commerce — shop-feed gateway client (vitana-v1 side).
 *
 * Pure fetch wrapper around the merged `/api/v1/shop-feed/*` routes (TikTok-style
 * video-shop feed + single-product drawer). This is the presentation/binding
 * layer over the EXISTING marketplace catalog — it does NOT fork catalog, cart,
 * checkout, or wallet. Buys flow through Universal Cart (`useUniversalCart`).
 *
 * STRICT SCOPE — DO NOT touch the legacy wallet/cart here.
 *   - This module talks ONLY to the gateway via `communityFetch`.
 *
 * Auth model: mirrors wallet-gateway-client.ts / universal-cart-client.ts —
 * every call goes through `communityFetch`, which sends
 * `Authorization: Bearer <supabase access token>` plus
 * `X-Vitana-Active-Role: community`. The feed surface is community-role-gated;
 * non-community / unauthenticated sessions get 401 / 403.
 *
 * Money is integer MINOR units (cents) everywhere on this rail.
 */

import { communityFetch } from "@/lib/community-gateway";

// =============================================================================
// Types
// =============================================================================

/** Product availability — open enum mirroring `products.availability`. */
export type ShopAvailability =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "discontinued"
  | "unknown"
  | string;

/** Marketplace product as surfaced inside the shop feed / drawer. */
export interface ShopProduct {
  id: string;
  title: string | null;
  price_cents: number | null;
  currency: string | null;
  compare_at_price_cents: number | null;
  images: string[];
  affiliate_url: string | null;
  availability: ShopAvailability;
  in_stock: boolean;
  rating: number | null;
  review_count: number | null;
  merchant_id: string | null;
  // Forward-compatible: the gateway may ship extra PDP fields (brand, category,
  // description, dosage, ...). Keep them addressable without widening the type.
  [key: string]: unknown;
}

/** Tappable anchor pill over a video — one primary anchor per video in V1. */
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

/** Provider-agnostic playback descriptor (HLS/MP4 from storage or a stream). */
export interface ShopPlayback {
  video_url: string;
  poster_url: string | null;
  thumbnail_url: string | null;
  duration_ms: number;
  aspect_ratio: string;
}

/** A single video in the vertical feed. */
export interface VideoItem {
  id: string;
  title: string | null;
  caption: string | null;
  creator_id: string | null;
  playback: ShopPlayback;
  primary_anchor: ShopAnchor | null;
}

export interface ShopFeedResponse {
  ok: true;
  videos: VideoItem[];
  next_cursor: string | null;
}

export interface ShopVideoResponse {
  ok: true;
  video: VideoItem;
}

/** Live (re-read price/stock) anchor payload returned when opening the drawer. */
export interface ShopAnchorLive {
  id: string;
  label: string;
  badge_price_cents: number | null;
  currency: string | null;
  product: ShopProduct;
}

export interface ShopAnchorResponse {
  ok: true;
  anchor: ShopAnchorLive;
}

/** View-funnel event type — the gateway's allowed set (telemetry, not OASIS). */
export type ShopEventType =
  | "impression"
  | "hold_2s"
  | "anchor_tap"
  | "drawer_open"
  | "drawer_expand"
  | "pdp_view"
  | "variant_change"
  | "add_to_cart"
  | "buy_now"
  | "checkout_start"
  | "purchase"
  | "save"
  | "unsave"
  | "share"
  | "drawer_close";

/** Per-video event body for POST /shop-feed/videos/:id/events. */
export interface ShopEventInput {
  type: ShopEventType;
  session_id: string;
  anchor_id?: string;
  product_id?: string;
  dwell_ms?: number;
  metadata?: Record<string, unknown>;
}

/** Batched event (carries its own video_id) for POST /shop-feed/events/batch. */
export interface ShopBatchEventInput extends ShopEventInput {
  video_id: string;
}

export interface ShopEventAck {
  ok: true;
}

/** A saved product (wishlist) row. */
export interface SavedProduct {
  id: string;
  product_id: string;
  video_id: string | null;
  created_at: string;
  product?: ShopProduct;
}

export interface SavedListResponse {
  ok: true;
  saved: SavedProduct[];
  next_cursor: string | null;
}

export interface SaveResponse {
  ok: true;
  saved: SavedProduct;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown for any non-2xx response (or an `{ ok:false }` body). Carries the
 * gateway's structured error code so call sites can map it to a translated
 * message. Mirrors `WalletGatewayApiError` in wallet-gateway-client.ts.
 */
export class ShopFeedApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = "ShopFeedApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// =============================================================================
// Fetch wrapper
// =============================================================================

interface ShopFetchOpts {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Core gateway call. Returns the parsed JSON body for 2xx `{ ok:true }`
 * responses; throws `ShopFeedApiError` for everything else.
 */
async function shopFeedFetch<T>(
  path: string,
  opts: ShopFetchOpts = {},
): Promise<T> {
  const res = await communityFetch(path, {
    method: opts.method ?? "GET",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* leave undefined */
    }
  }
  const asObj =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;

  if (!res.ok || asObj?.ok === false) {
    const code =
      asObj && typeof asObj.error === "string"
        ? asObj.error
        : `http_${res.status}`;
    const detail = asObj && "detail" in asObj ? asObj.detail : asObj;
    throw new ShopFeedApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

// =============================================================================
// Endpoint wrappers — thin, one per gateway route
// =============================================================================

/** GET /api/v1/shop-feed/videos — cursor-paged vertical feed. */
export function getShopFeed(
  params: { cursor?: string | null; limit?: number } = {},
  opts: ShopFetchOpts = {},
): Promise<ShopFeedResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return shopFeedFetch<ShopFeedResponse>(
    `/api/v1/shop-feed/videos${q ? `?${q}` : ""}`,
    { ...opts, method: "GET" },
  );
}

/** GET /api/v1/shop-feed/videos/:id — single video (deep link / share). */
export function getShopVideo(
  videoId: string,
  opts: ShopFetchOpts = {},
): Promise<ShopVideoResponse> {
  return shopFeedFetch<ShopVideoResponse>(
    `/api/v1/shop-feed/videos/${encodeURIComponent(videoId)}`,
    { ...opts, method: "GET" },
  );
}

/**
 * GET /api/v1/shop-feed/videos/:id/anchor — live (re-read price/stock) anchor
 * payload. Use when opening the drawer. The gateway returns 404
 * `anchor_unavailable` when the anchor / product is no longer buyable; that
 * surfaces as a `ShopFeedApiError` with `code === 'anchor_unavailable'`.
 */
export function getShopVideoAnchor(
  videoId: string,
  opts: ShopFetchOpts = {},
): Promise<ShopAnchorResponse> {
  return shopFeedFetch<ShopAnchorResponse>(
    `/api/v1/shop-feed/videos/${encodeURIComponent(videoId)}/anchor`,
    { ...opts, method: "GET" },
  );
}

/**
 * POST /api/v1/shop-feed/videos/:id/events — single view-funnel telemetry
 * event. Returns 202 ack.
 */
export function postShopVideoEvent(
  videoId: string,
  event: ShopEventInput,
  opts: ShopFetchOpts = {},
): Promise<ShopEventAck> {
  return shopFeedFetch<ShopEventAck>(
    `/api/v1/shop-feed/videos/${encodeURIComponent(videoId)}/events`,
    { ...opts, method: "POST", body: event },
  );
}

/**
 * POST /api/v1/shop-feed/events/batch — batched view-funnel telemetry. Batch
 * high-frequency IMPRESSION / HOLD events to save battery. Returns 202 ack.
 */
export function postShopEventBatch(
  events: ShopBatchEventInput[],
  opts: ShopFetchOpts = {},
): Promise<ShopEventAck> {
  return shopFeedFetch<ShopEventAck>("/api/v1/shop-feed/events/batch", {
    ...opts,
    method: "POST",
    body: { events },
  });
}

/** GET /api/v1/shop-feed/saved — cursor-paged saved products. */
export function getSavedProducts(
  params: { cursor?: string | null; limit?: number } = {},
  opts: ShopFetchOpts = {},
): Promise<SavedListResponse> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return shopFeedFetch<SavedListResponse>(
    `/api/v1/shop-feed/saved${q ? `?${q}` : ""}`,
    { ...opts, method: "GET" },
  );
}

/** POST /api/v1/shop-feed/saved — save (wishlist) a product. */
export function saveProduct(
  input: { product_id: string; video_id?: string },
  opts: ShopFetchOpts = {},
): Promise<SaveResponse> {
  return shopFeedFetch<SaveResponse>("/api/v1/shop-feed/saved", {
    ...opts,
    method: "POST",
    body: input,
  });
}

/** DELETE /api/v1/shop-feed/saved/:productId — remove a saved product. */
export function unsaveProduct(
  productId: string,
  opts: ShopFetchOpts = {},
): Promise<ShopEventAck> {
  return shopFeedFetch<ShopEventAck>(
    `/api/v1/shop-feed/saved/${encodeURIComponent(productId)}`,
    { ...opts, method: "DELETE" },
  );
}
