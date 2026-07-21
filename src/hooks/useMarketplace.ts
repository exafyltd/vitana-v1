/**
 * VTID-02000: Marketplace hooks — useMarketplaceFeed + useMarketplaceSearch.
 *
 * Calls the gateway's /api/v1/discover/feed and /api/v1/discover/search.
 * Replaces mock data arrays in Discover.tsx with real backend data.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toEurCents } from "@/lib/currency-convert";

// VITE_GATEWAY_URL in this repo already includes "/api/v1"; VITE_GATEWAY_BASE
// is the bare origin. Normalize to a bare origin so paths below can append
// "/api/v1/..." without producing "/api/v1/api/v1/..." (which 404s).
const GATEWAY_URL = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "") ||
  ""
).replace(/\/+$/, "");

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ==================== Types ====================

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string | null;
  description_long?: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  price_cents: number | null;
  currency: string | null;
  compare_at_price_cents: number | null;
  images: string[];
  affiliate_url: string;
  availability: string;
  rating: number | null;
  review_count: number | null;
  origin_country: string | null;
  origin_region: string | null;
  merchant_id: string | null;
  ingredients_primary: string[];
  health_goals: string[];
  dietary_tags: string[];
  reward_preview: { points_estimate?: number; currency?: string } | null;
  match_score?: number;
  match_reasons?: Array<{ kind: string; text: string }>;
  rank_score?: number;
  rank_reasons?: string[];
  // Product-detail drawer fields (backend: 20260418040000)
  dosage?: string | null;
  serving_size?: string | null;
  servings_per_container?: number | null;
  evidence_links?: Array<{ title?: string; url?: string; source_type?: string }>;
  safety_notes?: string | null;
}

export interface HiddenBreakdown {
  allergies: number;
  contraindications: number;
  medications: number;
  dietary: number;
  budget: number;
  sensitivities: number;
  geo: number;
  excluded_region: number;
  past_purchases?: number;
}

export interface FeedContext {
  lifecycle_stage: string | null;
  personalization_weight: number;
  region_group: string | null;
  scope: string;
  rationale: string;
  // True when the backend served the guest starter feed (no session). Drives
  // the signed-out CTA on the Discover surface.
  guest?: boolean;
}

export interface MarketplaceFeedResponse {
  ok: boolean;
  items: MarketplaceProduct[];
  feed_context: FeedContext;
  hidden_breakdown: HiddenBreakdown;
  error?: string;
}

export interface MarketplaceSearchResponse {
  ok: boolean;
  items: MarketplaceProduct[];
  total_count: number;
  applied_filters: Record<string, unknown>;
  hidden_breakdown: HiddenBreakdown;
  hidden_total: number;
  suggested_expansions: string[];
  error?: string;
}

// ==================== Feed hook ====================

export function useMarketplaceFeed(opts: {
  category?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  return useQuery<MarketplaceFeedResponse>({
    queryKey: ["marketplace-feed", opts.category, opts.limit],
    queryFn: async () => {
      if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
      const params = new URLSearchParams();
      if (opts.category) params.set("category", opts.category);
      if (opts.limit) params.set("limit", String(opts.limit));
      const headers = await authHeaders();
      const resp = await fetch(
        `${GATEWAY_URL}/api/v1/discover/feed?${params.toString()}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`Feed failed: ${resp.status}`);
      return resp.json();
    },
    enabled: opts.enabled !== false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== Search hook ====================

export interface MarketplaceSearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  health_goals?: string[];
  dietary_tags?: string[];
  ingredients_any?: string[];
  user_condition?: string;
  form?: string;
  price_min_cents?: number;
  price_max_cents?: number;
  rating_min?: number;
  scope?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
  limit?: number;
  offset?: number;
}

// ==================== Single-product hook ====================

export interface MarketplaceProductResponse {
  ok: boolean;
  product?: MarketplaceProduct;
  error?: string;
}

export function useMarketplaceProduct(id: string | null | undefined, opts: { enabled?: boolean } = {}) {
  return useQuery<MarketplaceProductResponse>({
    queryKey: ["marketplace-product", id],
    queryFn: async () => {
      if (!id) throw new Error("missing product id");
      if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/discover/product/${id}`, { headers });
      if (resp.status === 404) return { ok: false, error: "not_found" };
      if (!resp.ok) throw new Error(`Product fetch failed: ${resp.status}`);
      return resp.json();
    },
    enabled: !!id && opts.enabled !== false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMarketplaceSearch(params: MarketplaceSearchParams, opts: { enabled?: boolean } = {}) {
  return useQuery<MarketplaceSearchResponse>({
    queryKey: ["marketplace-search", params],
    queryFn: async () => {
      if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.category) qs.set("category", params.category);
      if (params.subcategory) qs.set("subcategory", params.subcategory);
      if (params.health_goals?.length) qs.set("health_goals", params.health_goals.join(","));
      if (params.dietary_tags?.length) qs.set("dietary_tags", params.dietary_tags.join(","));
      if (params.ingredients_any?.length) qs.set("ingredients_any", params.ingredients_any.join(","));
      if (params.user_condition) qs.set("user_condition", params.user_condition);
      if (params.form) qs.set("form", params.form);
      if (params.price_min_cents !== undefined) qs.set("price_min_cents", String(params.price_min_cents));
      if (params.price_max_cents !== undefined) qs.set("price_max_cents", String(params.price_max_cents));
      if (params.rating_min !== undefined) qs.set("rating_min", String(params.rating_min));
      if (params.scope) qs.set("scope", params.scope);
      if (params.sort) qs.set("sort", params.sort);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      const headers = await authHeaders();
      const resp = await fetch(
        `${GATEWAY_URL}/api/v1/discover/search?${qs.toString()}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
      return resp.json();
    },
    enabled: opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ==================== Helpers ====================

export function formatPrice(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents === null || cents === undefined || !currency) return "";
  const eurCents = toEurCents(cents, currency);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eurCents / 100);
}

export function getRedirectUrl(productId: string, surface: string = "discover", recId?: string | null): string {
  const base = `${GATEWAY_URL}/r/${productId}?surface=${surface}`;
  return recId ? `${base}&rec_id=${encodeURIComponent(recId)}` : base;
}

// ==================== Recommend & Earn (VTID-02950) ====================

export interface CreateRecommendationResponse {
  ok: boolean;
  recommendation_id: string;
  share_url: string;
  product_title: string;
  error?: string;
}

/** Creates (or reuses) the caller's recommendation for a product and returns a shareable link. */
export async function createProductRecommendation(productId: string): Promise<CreateRecommendationResponse> {
  const headers = await authHeaders();
  const resp = await fetch(`${GATEWAY_URL}/api/v1/discover/recommendations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ product_id: productId }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.ok) throw new Error(data.error || `Recommend failed: ${resp.status}`);
  return data;
}

export interface MyRecommendationItem {
  id: string;
  product_id: string;
  product_title: string | null;
  product_thumbnail_url: string | null;
  status: string;
  click_count: number;
  conversion_count: number;
  commission_earned_minor: number;
  currency: string;
  created_at: string;
}

export function useMyRecommendations(opts: { enabled?: boolean } = {}) {
  return useQuery<{ ok: boolean; items: MyRecommendationItem[] }>({
    queryKey: ["my-recommendations"],
    queryFn: async () => {
      if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/discover/my-recommendations`, { headers });
      if (!resp.ok) throw new Error(`My recommendations failed: ${resp.status}`);
      return resp.json();
    },
    enabled: opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// Public storefront view of ANOTHER user's recommendations (Business tab,
// visitor view) — deliberately excludes click_count/conversion_count/
// commission_earned_minor/currency/status, which are private to the owner.
export interface PublicRecommendationItem {
  recommendation_id: string;
  product_id: string;
  product_title: string | null;
  product_thumbnail_url: string | null;
  created_at: string;
}

export function usePublicRecommendations(vitanaId: string | undefined, opts: { enabled?: boolean } = {}) {
  return useQuery<{ ok: boolean; items: PublicRecommendationItem[] }>({
    queryKey: ["public-recommendations", vitanaId],
    queryFn: async () => {
      if (!GATEWAY_URL) throw new Error("GATEWAY_URL not configured");
      if (!vitanaId) throw new Error("missing vitanaId");
      const headers = await authHeaders();
      const resp = await fetch(
        `${GATEWAY_URL}/api/v1/discover/recommendations/${encodeURIComponent(vitanaId)}`,
        { headers }
      );
      if (resp.status === 404) return { ok: false, items: [] };
      if (!resp.ok) throw new Error(`Public recommendations failed: ${resp.status}`);
      return resp.json();
    },
    enabled: !!vitanaId && opts.enabled !== false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
