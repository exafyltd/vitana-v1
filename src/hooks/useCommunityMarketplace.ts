/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — hooks for the peer-to-peer classifieds
 * feature (distinct from the curated affiliate catalog in useMarketplace.ts,
 * and distinct from the commercial-intent board at /discover/marketplace).
 *
 * Calls the gateway's /api/v1/community-marketplace/* routes
 * (services/gateway/src/routes/community-marketplace.ts in vitana-platform).
 * Every route there is tenant+auth-required — there is no guest fallback.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_URL = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "") ||
  ""
).replace(/\/+$/, "");

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("not_authenticated");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ==================== Types (mirror serializeListing() in the gateway route) ====================

export type ListingKind = "product" | "service";
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "used";
export type DeliveryMethod = "pickup" | "shipping" | "both" | "not_applicable";
export type ListingStatus = "draft" | "active" | "paused" | "sold" | "removed" | "suspended";

export interface CommunityListingSeller {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  vitana_id: string | null;
  verification_status: string | null;
}

export interface CommunityListing {
  id: string;
  seller_user_id: string;
  listing_kind: ListingKind;
  condition: ListingCondition | null;
  category: string;
  subcategory: string | null;
  title: string;
  description: string;
  images: string[];
  price_cents: number | null;
  currency: string | null;
  price_on_request: boolean;
  location_text: string | null;
  is_remote_service: boolean;
  delivery_method: DeliveryMethod;
  requires_verified_provider: boolean;
  status: ListingStatus;
  sold_at: string | null;
  renewed_at: string | null;
  expires_at: string;
  view_count: number;
  contact_click_count: number;
  created_at: string;
  updated_at: string;
  seller?: CommunityListingSeller;
  // Owner-only fields — present only when the caller is the seller.
  auto_check_result?: "pending" | "passed" | "flagged";
  auto_check_reasons?: string[];
  requires_admin_review?: boolean;
  admin_review_reason?: string | null;
}

export interface CommunityListingCategory {
  key: string;
  listing_kind: "product" | "service" | "both";
  display_label: string;
  parent_key: string | null;
  sort_order: number;
}

interface ListingsResponse {
  ok: boolean;
  error?: string;
  listings: CommunityListing[];
  meta?: { total_count: number; limit: number; offset: number };
}
type CategoriesResponse = { ok: boolean; error?: string; categories: CommunityListingCategory[] };
type ListingDetailResponse = { ok: boolean; error?: string; listing?: CommunityListing };

async function fetchJson<T>(path: string): Promise<T> {
  if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
  const headers = await authHeaders();
  const resp = await fetch(`${GATEWAY_URL}${path}`, { headers });
  if (!resp.ok && resp.status !== 404) throw new Error(`Request failed: ${resp.status}`);
  return resp.json();
}

async function sendJson<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
  const headers = await authHeaders();
  const resp = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json();
  if (!resp.ok || !data.ok) {
    const err = new Error(data.error || `Request failed: ${resp.status}`) as Error & { code?: string; details?: unknown };
    err.code = data.error;
    err.details = data.details;
    throw err;
  }
  return data;
}

// ==================== Categories ====================

export function useCommunityListingCategories(listingKind?: "product" | "service") {
  return useQuery<CategoriesResponse>({
    queryKey: ["community-marketplace-categories", listingKind],
    queryFn: () => {
      const qs = listingKind ? `?listing_kind=${listingKind}` : "";
      return fetchJson<CategoriesResponse>(`/api/v1/community-marketplace/categories${qs}`);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== Browse / search ====================

export interface CommunityListingBrowseParams {
  q?: string;
  category?: string;
  subcategory?: string;
  listing_kind?: ListingKind;
  condition?: ListingCondition;
  delivery_method?: DeliveryMethod;
  min_price_cents?: number;
  max_price_cents?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}

export function useCommunityListings(params: CommunityListingBrowseParams, opts: { enabled?: boolean } = {}) {
  return useQuery<ListingsResponse>({
    queryKey: ["community-marketplace-listings", params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.category) qs.set("category", params.category);
      if (params.subcategory) qs.set("subcategory", params.subcategory);
      if (params.listing_kind) qs.set("listing_kind", params.listing_kind);
      if (params.condition) qs.set("condition", params.condition);
      if (params.delivery_method) qs.set("delivery_method", params.delivery_method);
      if (params.min_price_cents !== undefined) qs.set("min_price_cents", String(params.min_price_cents));
      if (params.max_price_cents !== undefined) qs.set("max_price_cents", String(params.max_price_cents));
      if (params.sort) qs.set("sort", params.sort);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      return fetchJson<ListingsResponse>(`/api/v1/community-marketplace/listings?${qs.toString()}`);
    },
    enabled: opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== Single listing ====================

export function useCommunityListing(id: string | null | undefined, opts: { enabled?: boolean } = {}) {
  return useQuery<ListingDetailResponse>({
    queryKey: ["community-marketplace-listing", id],
    queryFn: () => fetchJson<ListingDetailResponse>(`/api/v1/community-marketplace/listings/${id}`),
    enabled: !!id && opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== My listings (seller dashboard) ====================

export function useMyCommunityListings(params: { status?: ListingStatus; limit?: number; offset?: number } = {}, opts: { enabled?: boolean } = {}) {
  return useQuery<ListingsResponse>({
    queryKey: ["community-marketplace-my-listings", params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      return fetchJson<ListingsResponse>(`/api/v1/community-marketplace/my/listings?${qs.toString()}`);
    },
    enabled: opts.enabled !== false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== Create / edit (Chunk 4) ====================

export interface CommunityListingInput {
  listing_kind: ListingKind;
  condition?: ListingCondition;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  images: string[];
  price_cents?: number;
  currency?: string;
  price_on_request: boolean;
  location_text?: string;
  is_remote_service: boolean;
  delivery_method: DeliveryMethod;
}

export async function createCommunityListing(input: CommunityListingInput): Promise<{ ok: boolean; listing: CommunityListing }> {
  return sendJson("/api/v1/community-marketplace/listings", "POST", input);
}

export async function updateCommunityListing(
  id: string,
  input: Partial<Omit<CommunityListingInput, "listing_kind">>
): Promise<{ ok: boolean; listing: CommunityListing }> {
  return sendJson(`/api/v1/community-marketplace/listings/${id}`, "PATCH", input);
}

// ==================== Contact-click (analytics; full messaging CTA is a later chunk) ====================

export interface ContactSellerResponse {
  ok: boolean;
  error?: string;
  seller?: { user_id: string; display_name: string | null; vitana_id: string | null };
}

export async function contactCommunityListingSeller(id: string): Promise<ContactSellerResponse> {
  const headers = await authHeaders();
  const resp = await fetch(`${GATEWAY_URL}/api/v1/community-marketplace/listings/${id}/contact-click`, {
    method: "POST",
    headers,
  });
  const data = await resp.json();
  if (!resp.ok || !data.ok) throw new Error(data.error || `Contact click failed: ${resp.status}`);
  return data;
}

// ==================== Reports (Chunk 6) ====================

export type ListingReportReason =
  | "prohibited_item"
  | "misleading"
  | "counterfeit"
  | "spam"
  | "offensive"
  | "scam"
  | "other";

export async function reportCommunityListing(
  id: string,
  input: { report_reason: ListingReportReason; report_note?: string }
): Promise<{ ok: boolean; report_id: string }> {
  return sendJson(`/api/v1/community-marketplace/listings/${id}/reports`, "POST", input);
}

// ==================== Seller blocks (Chunk 6) ====================

export interface CommunitySellerBlock {
  id: string;
  blocked_seller_id: string;
  blocked_seller_display_name: string | null;
  blocked_seller_vitana_id: string | null;
  reason: string | null;
  created_at: string;
}

export function useCommunitySellerBlocks(opts: { enabled?: boolean } = {}) {
  return useQuery<{ ok: boolean; blocks: CommunitySellerBlock[] }>({
    queryKey: ["community-marketplace-seller-blocks"],
    queryFn: () => fetchJson("/api/v1/community-marketplace/seller-blocks"),
    enabled: opts.enabled !== false,
    staleTime: 30_000,
  });
}

export async function blockCommunityListingSeller(
  blockedSellerId: string,
  reason?: string
): Promise<{ ok: boolean; block_id: string }> {
  return sendJson("/api/v1/community-marketplace/seller-blocks", "POST", {
    blocked_seller_id: blockedSellerId,
    reason,
  });
}

export async function unblockCommunityListingSeller(blockedSellerId: string): Promise<{ ok: boolean }> {
  return sendJson(`/api/v1/community-marketplace/seller-blocks/${blockedSellerId}`, "DELETE");
}

// ==================== Formatting ====================

/** Returns null for price-on-request listings — caller renders its own localized fallback text. */
export function formatListingPrice(listing: {
  price_cents: number | null;
  currency: string | null;
  price_on_request: boolean;
}): string | null {
  if (listing.price_on_request || listing.price_cents == null || !listing.currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: listing.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(listing.price_cents / 100);
  } catch {
    return `${(listing.price_cents / 100).toFixed(2)} ${listing.currency}`;
  }
}
