/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — native twins of
 * the web marketplace hooks (`src/hooks/useMarketplace.ts`, class B: it reads
 * the session from the web Supabase client and `import.meta.env`). Same
 * gateway calls, query keys, params and stale times:
 *
 *   GET  /discover/feed?category&limit                 useMarketplaceFeed
 *   GET  /discover/search?q&category&subcategory&…    useMarketplaceSearch
 *   GET  /discover/my-recommendations                  useMyRecommendations
 *   POST /discover/recommendations { product_id }      createProductRecommendation
 *   <origin>/r/:id?surface=…&rec_id=…                  getRedirectUrl (affiliate "Buy")
 *
 * `formatPrice` (EUR display price) is the web function itself, generated into
 * `@vitana/core/discover` and read through the Discover port.
 */
import { useQuery } from '@tanstack/react-query';
import { discoverJson, gatewayOrigin } from './client';

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
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  limit?: number;
  offset?: number;
}

/** web `fetchMarketplaceFeed`. */
export async function fetchMarketplaceFeed(opts: { category?: string; limit?: number } = {}): Promise<MarketplaceFeedResponse> {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  if (opts.limit) params.set('limit', String(opts.limit));
  const res = await discoverJson<MarketplaceFeedResponse>(`/discover/feed?${params.toString()}`);
  if (!res.ok) throw new Error(`Feed failed: ${res.status}`);
  return res.body;
}

export function useMarketplaceFeed(opts: { category?: string; limit?: number; enabled?: boolean } = {}) {
  return useQuery<MarketplaceFeedResponse>({
    queryKey: ['marketplace-feed', opts.category, opts.limit],
    queryFn: () => fetchMarketplaceFeed(opts),
    enabled: opts.enabled !== false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** The web search query string, built in the same order (useMarketplace.ts useMarketplaceSearch). */
export function searchQueryString(params: MarketplaceSearchParams): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.subcategory) qs.set('subcategory', params.subcategory);
  if (params.health_goals?.length) qs.set('health_goals', params.health_goals.join(','));
  if (params.dietary_tags?.length) qs.set('dietary_tags', params.dietary_tags.join(','));
  if (params.ingredients_any?.length) qs.set('ingredients_any', params.ingredients_any.join(','));
  if (params.user_condition) qs.set('user_condition', params.user_condition);
  if (params.form) qs.set('form', params.form);
  if (params.price_min_cents !== undefined) qs.set('price_min_cents', String(params.price_min_cents));
  if (params.price_max_cents !== undefined) qs.set('price_max_cents', String(params.price_max_cents));
  if (params.rating_min !== undefined) qs.set('rating_min', String(params.rating_min));
  if (params.scope) qs.set('scope', params.scope);
  if (params.sort) qs.set('sort', params.sort);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  return qs.toString();
}

export function useMarketplaceSearch(params: MarketplaceSearchParams, opts: { enabled?: boolean } = {}) {
  return useQuery<MarketplaceSearchResponse>({
    queryKey: ['marketplace-search', params],
    queryFn: async () => {
      const res = await discoverJson<MarketplaceSearchResponse>(`/discover/search?${searchQueryString(params)}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      return res.body;
    },
    enabled: opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** web `getRedirectUrl`: the gateway's tracked affiliate redirect (bare origin, not `/api/v1`). */
export function getRedirectUrl(productId: string, surface = 'discover', recId?: string | null): string {
  const base = `${gatewayOrigin()}/r/${productId}?surface=${surface}`;
  return recId ? `${base}&rec_id=${encodeURIComponent(recId)}` : base;
}

// ── Recommend & Earn (VTID-02950) ───────────────────────────────────────
export interface CreateRecommendationResponse {
  ok: boolean;
  recommendation_id: string;
  share_url: string;
  product_title: string;
  error?: string;
}

export async function createProductRecommendation(productId: string): Promise<CreateRecommendationResponse> {
  const res = await discoverJson<CreateRecommendationResponse>('/discover/recommendations', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok || !res.body.ok) throw new Error(res.body.error || `Recommend failed: ${res.status}`);
  return res.body;
}

export interface MyRecommendationItem {
  id: string;
  product_id: string;
  product_title: string | null;
  status: string;
  created_at: string;
}

export function useMyRecommendations(opts: { enabled?: boolean } = {}) {
  return useQuery<{ ok: boolean; items: MyRecommendationItem[] }>({
    queryKey: ['my-recommendations'],
    queryFn: async () => {
      const res = await discoverJson<{ ok: boolean; items: MyRecommendationItem[] }>('/discover/my-recommendations');
      if (!res.ok) throw new Error(`My recommendations failed: ${res.status}`);
      return res.body;
    },
    enabled: opts.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
