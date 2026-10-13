/**
 * VTID-05109 — Discover storefront adapters: marketplace product, wellness
 * service, provider and Share & Earn recommendation → VCard slots.
 *
 * Pure functions (no hooks, no JSX, no i18n lookups) so every Discover screen
 * maps the same record the same way. Prices go through the locale-aware
 * `fmtNumber` helper (contract SR-28); numbers are only ever taken from the
 * record itself — an adapter never invents a value (SR-24).
 */
import type { MarketplaceProduct, MyRecommendationItem } from '@/hooks/useMarketplace';
import type { BookmarkedItem } from '@/types/bookmarks';
import { toEurCents } from '@/lib/currency-convert';
import { fmtNumber } from '@/lib/locale-format';
import { productToVCard, type VCardData } from './index';

/** Price in EUR, formatted for the UI locale. '' when the record has no price. */
export function discoverPrice(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents == null || !currency) return '';
  const eur = toEurCents(cents, currency) / 100;
  return fmtNumber(eur, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "★ 4.8 (312)" — only when the product carries a real rating. */
export function discoverRating(rating: number | null | undefined, reviews?: number | null): string {
  if (rating == null || rating <= 0) return '';
  const r = fmtNumber(rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return reviews ? `★ ${r} (${fmtNumber(reviews)})` : `★ ${r}`;
}

export interface StorefrontProductCard extends VCardData {
  price: string;
  rating: string;
  /** First personal match reason from the gateway, when there is one. */
  reason?: string;
}

/** A marketplace product on the storefront: locale-aware price, real rating, real match reason. */
export function storefrontProductToVCard(product: MarketplaceProduct): StorefrontProductCard {
  const base = productToVCard(product);
  const price = discoverPrice(product.price_cents, product.currency);
  const rating = discoverRating(product.rating, product.review_count);
  const reason = product.match_reasons?.find((r) => r.text)?.text ?? product.rank_reasons?.find(Boolean) ?? undefined;
  return {
    ...base,
    eyebrow: product.brand ?? product.subcategory ?? product.category ?? undefined,
    meta: [price, rating].filter(Boolean).join(' · ') || undefined,
    body: reason ?? product.description ?? undefined,
    price,
    rating,
    reason,
  };
}

/** True when the record carries a real discount (compare-at above the price). */
export function isDiscounted(product: MarketplaceProduct): boolean {
  return product.compare_at_price_cents != null && product.price_cents != null && product.compare_at_price_cents > product.price_cents;
}

/** Discount in whole percent, computed from the record; null when not discounted. */
export function discountPercent(product: MarketplaceProduct): number | null {
  if (!isDiscounted(product)) return null;
  return Math.round((1 - (product.price_cents as number) / (product.compare_at_price_cents as number)) * 100);
}

// ---------------------------------------------------------------- services ---

export interface DiscoverService {
  id: string;
  title: string;
  provider?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

/** A wellness service. No real service catalog exists yet, so the source is the member's own saved items. */
export function serviceToVCard(service: DiscoverService): VCardData {
  return {
    key: `service-${service.id}`,
    media: { src: service.imageUrl ?? null, alt: service.title },
    eyebrow: service.provider ?? undefined,
    title: service.title,
    body: service.description ?? undefined,
    href: '/discover/wellness-services',
  };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** A saved `wellness_service` bookmark → service. */
export function bookmarkToService(b: BookmarkedItem): DiscoverService {
  const m = b.item_metadata ?? {};
  return { id: b.item_id, title: b.item_name, provider: str(m.provider), description: str(m.description), imageUrl: b.item_image_url ?? null };
}

// --------------------------------------------------------------- providers ---

export interface DiscoverProvider {
  id: string;
  name: string;
  specialty?: string | null;
  location?: string | null;
  imageUrl?: string | null;
}

/** A doctor / coach. Links to the existing provider detail route. */
export function providerToVCard(provider: DiscoverProvider): VCardData {
  return {
    key: `provider-${provider.id}`,
    media: { src: provider.imageUrl ?? null, alt: provider.name },
    eyebrow: provider.specialty ?? undefined,
    title: provider.name,
    meta: provider.location ?? undefined,
    href: `/discover/provider/${encodeURIComponent(provider.id)}`,
  };
}

/** A saved `provider` bookmark → provider. */
export function bookmarkToProvider(b: BookmarkedItem): DiscoverProvider {
  const m = b.item_metadata ?? {};
  return { id: b.item_id, name: b.item_name, specialty: str(m.specialty), location: str(m.location), imageUrl: b.item_image_url ?? null };
}

// ------------------------------------------------------ Share & Earn items ---

export interface RecommendationCard extends VCardData {
  clicks: number;
  conversions: number;
  earned: string;
}

/** One of the member's own Recommend & Earn links, with its real counters. */
export function recommendationToVCard(rec: MyRecommendationItem): RecommendationCard {
  const earned = discoverPrice(rec.commission_earned_minor ?? 0, rec.currency || 'EUR');
  return {
    key: `rec-${rec.id}`,
    media: { src: rec.product_thumbnail_url ?? null, alt: rec.product_title ?? '' },
    title: rec.product_title ?? '',
    href: `/discover/product/${rec.product_id}`,
    clicks: rec.click_count ?? 0,
    conversions: rec.conversion_count ?? 0,
    earned,
  };
}
