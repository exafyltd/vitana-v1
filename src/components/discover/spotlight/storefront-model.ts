/**
 * VTID-05109 — the Discover storefront's pure model: grid classes, filter
 * chips and the mapping from chips + search text to the EXISTING gateway
 * search contract (`useMarketplaceSearch` → GET /api/v1/discover/search).
 * No new parameters are invented here; every field below is one the gateway
 * already accepts (q, category, subcategory, health_goals, price_max_cents,
 * rating_min, sort, limit).
 */
import type { MarketplaceProduct, MarketplaceSearchParams } from '@/hooks/useMarketplace';

/** `standard` VCard grid: 2 columns, 4 from xl. Shelves show 4 items, so every row is full (SR-13). */
export const DISCOVER_GRID = 'grid grid-cols-2 gap-4 xl:grid-cols-4';

/** Number of cards a shelf shows — one full row at xl, two full rows below. */
export const SHELF_SIZE = 4;

/** Goal chips → the gateway's canonical `health_goals` slugs (supplement-inference HEALTH_GOALS). */
export const GOAL_CHIPS = [
  { id: 'sleep', goal: 'better-sleep', labelKey: 'spotlightDiscover.storefront.chips.sleep' },
  { id: 'energy', goal: 'energy', labelKey: 'spotlightDiscover.storefront.chips.energy' },
  { id: 'gut', goal: 'gut-health', labelKey: 'spotlightDiscover.storefront.chips.gutHealth' },
  { id: 'strength', goal: 'muscle-recovery', labelKey: 'spotlightDiscover.storefront.chips.strength' },
  { id: 'longevity', goal: 'longevity', labelKey: 'spotlightDiscover.storefront.chips.longevity' },
] as const;

export type GoalChipId = (typeof GOAL_CHIPS)[number]['id'];

/** "Under 30 €" chip (EUR minor units) and "★ 4.5+" chip. */
export const PRICE_CHIP_MAX_CENTS = 3000;
export const RATING_CHIP_MIN = 4.5;

export interface StorefrontFilters {
  goal: GoalChipId | null;
  underPrice: boolean;
  topRated: boolean;
}

export const NO_FILTERS: StorefrontFilters = { goal: null, underPrice: false, topRated: false };

export function hasActiveFilters(f: StorefrontFilters): boolean {
  return f.goal !== null || f.underPrice || f.topRated;
}

/** Search text or any chip switches the storefront from shelves to results. */
export function isResultsMode(query: string, f: StorefrontFilters): boolean {
  return query.trim().length > 0 || hasActiveFilters(f);
}

export function buildStorefrontSearch(query: string, f: StorefrontFilters, limit = 24): MarketplaceSearchParams {
  const goal = GOAL_CHIPS.find((c) => c.id === f.goal)?.goal;
  const params: MarketplaceSearchParams = { sort: 'relevance', limit };
  const q = query.trim();
  if (q) params.q = q;
  if (goal) params.health_goals = [goal];
  if (f.underPrice) params.price_max_cents = PRICE_CHIP_MAX_CENTS;
  if (f.topRated) params.rating_min = RATING_CHIP_MIN;
  return params;
}

/** The deals shelf/page reads the same over-fetched search the legacy Deals page uses and keeps real discounts only. */
export const DEALS_SEARCH: MarketplaceSearchParams = { limit: 48, sort: 'relevance' };

export function realDeals(items: MarketplaceProduct[] | undefined): MarketplaceProduct[] {
  return (items ?? []).filter(
    (p) => p.compare_at_price_cents != null && p.price_cents != null && p.compare_at_price_cents > p.price_cents,
  );
}

/** Supplements sub-page chips: the subcategory values the legacy Select already sends. */
export const SUPPLEMENT_SUBCATEGORIES = [
  { value: 'all', labelKey: 'spotlightDiscover.supplements.sub.all' },
  { value: 'multivitamins', labelKey: 'spotlightDiscover.supplements.sub.multivitamins' },
  { value: 'vitamins', labelKey: 'spotlightDiscover.supplements.sub.vitamins' },
  { value: 'minerals', labelKey: 'spotlightDiscover.supplements.sub.minerals' },
  { value: 'essential-fatty-acids', labelKey: 'spotlightDiscover.supplements.sub.omega3' },
  { value: 'adaptogens', labelKey: 'spotlightDiscover.supplements.sub.adaptogens' },
  { value: 'nootropics', labelKey: 'spotlightDiscover.supplements.sub.nootropics' },
  { value: 'longevity', labelKey: 'spotlightDiscover.supplements.sub.longevity' },
  { value: 'immunity', labelKey: 'spotlightDiscover.supplements.sub.immunity' },
  { value: 'antioxidants', labelKey: 'spotlightDiscover.supplements.sub.antioxidants' },
  { value: 'sleep', labelKey: 'spotlightDiscover.supplements.sub.sleep' },
  { value: 'performance', labelKey: 'spotlightDiscover.supplements.sub.performance' },
  { value: 'beauty', labelKey: 'spotlightDiscover.supplements.sub.beauty' },
  { value: 'gut-health', labelKey: 'spotlightDiscover.supplements.sub.gutHealth' },
  { value: 'herbs', labelKey: 'spotlightDiscover.supplements.sub.herbs' },
  { value: 'heart-health', labelKey: 'spotlightDiscover.supplements.sub.heartHealth' },
] as const;

export const SUPPLEMENT_SORTS = [
  { value: 'relevance', labelKey: 'spotlightDiscover.supplements.sort.relevance' },
  { value: 'rating', labelKey: 'spotlightDiscover.supplements.sort.rating' },
  { value: 'price_asc', labelKey: 'spotlightDiscover.supplements.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'spotlightDiscover.supplements.sort.priceDesc' },
] as const;

export type SupplementSort = (typeof SUPPLEMENT_SORTS)[number]['value'];

/** The quick-view sheet opens from the inline-end side: right in LTR, left in RTL. */
export function inlineEndSide(): 'left' | 'right' {
  if (typeof document === 'undefined') return 'right';
  return document.documentElement.dir === 'rtl' ? 'left' : 'right';
}
