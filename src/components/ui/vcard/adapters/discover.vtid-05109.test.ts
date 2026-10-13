/** VTID-05109 — Discover adapters: product / service / provider / recommendation → VCard slots. */
import { describe, expect, it } from 'vitest';
import type { MarketplaceProduct, MyRecommendationItem } from '@/hooks/useMarketplace';
import type { BookmarkedItem } from '@/types/bookmarks';
import {
  bookmarkToProvider,
  bookmarkToService,
  discountPercent,
  discoverPrice,
  discoverRating,
  isDiscounted,
  providerToVCard,
  recommendationToVCard,
  serviceToVCard,
  storefrontProductToVCard,
} from './index';

const product = (over: Partial<MarketplaceProduct> = {}): MarketplaceProduct =>
  ({
    id: 'p1',
    title: 'Magnesium Glycinate 400',
    description: 'Lab-tested, vegan',
    brand: 'NordVital',
    category: 'supplements',
    subcategory: 'sleep',
    price_cents: 2490,
    currency: 'EUR',
    compare_at_price_cents: null,
    images: ['m.jpg'],
    rating: 4.8,
    review_count: 312,
    match_reasons: [{ kind: 'goal', text: 'Fits your sleep goal' }],
    ...over,
  }) as unknown as MarketplaceProduct;

const bookmark = (over: Partial<BookmarkedItem> = {}): BookmarkedItem => ({
  id: 'b1',
  user_id: 'u1',
  item_type: 'provider',
  item_id: '7',
  item_name: 'Dr. Example',
  item_image_url: 'dr.jpg',
  item_metadata: { specialty: 'Longevity', location: 'Berlin', provider: 'Clinic' },
  created_at: '',
  updated_at: '',
  ...over,
});

describe('VTID-05109 discover adapters', () => {
  it('formats prices in EUR through the locale helper and never invents one', () => {
    expect(discoverPrice(2490, 'EUR')).toMatch(/24[.,]90/);
    expect(discoverPrice(null, 'EUR')).toBe('');
    expect(discoverPrice(100, null)).toBe('');
  });

  it('rating text only for a real rating', () => {
    expect(discoverRating(4.8, 312)).toMatch(/^★ 4[.,]8 \(312\)$/);
    expect(discoverRating(null, 5)).toBe('');
    expect(discoverRating(0, 5)).toBe('');
  });

  it('storefront product: brand eyebrow, price · rating meta, match reason body, detail route', () => {
    const d = storefrontProductToVCard(product());
    expect(d.title).toBe('Magnesium Glycinate 400');
    expect(d.eyebrow).toBe('NordVital');
    expect(d.meta).toMatch(/24[.,]90.*★ 4[.,]8/);
    expect(d.body).toBe('Fits your sleep goal');
    expect(d.href).toBe('/discover/product/p1');
    expect(d.media).toEqual({ src: 'm.jpg', alt: 'Magnesium Glycinate 400' });
  });

  it('product without rating, price or reason has no fabricated meta', () => {
    const d = storefrontProductToVCard(product({ rating: null, price_cents: null, match_reasons: [], description: null }));
    expect(d.meta).toBeUndefined();
    expect(d.body).toBeUndefined();
  });

  it('discount only from real compare-at prices', () => {
    expect(isDiscounted(product())).toBe(false);
    expect(discountPercent(product())).toBeNull();
    const p = product({ compare_at_price_cents: 3000, price_cents: 2400 });
    expect(isDiscounted(p)).toBe(true);
    expect(discountPercent(p)).toBe(20);
  });

  it('service and provider from saved items', () => {
    const s = serviceToVCard(bookmarkToService(bookmark({ item_type: 'wellness_service', item_name: 'Float session' })));
    expect(s).toMatchObject({ title: 'Float session', eyebrow: 'Clinic', href: '/discover/wellness-services' });
    const p = providerToVCard(bookmarkToProvider(bookmark()));
    expect(p).toMatchObject({ title: 'Dr. Example', eyebrow: 'Longevity', meta: 'Berlin', href: '/discover/provider/7' });
    expect(p.media).toEqual({ src: 'dr.jpg', alt: 'Dr. Example' });
  });

  it('recommendation keeps its real counters', () => {
    const rec: MyRecommendationItem = {
      id: 'r1', product_id: 'p1', product_title: 'Omega-3', product_thumbnail_url: null, status: 'active',
      click_count: 12, conversion_count: 2, commission_earned_minor: 450, currency: 'EUR', created_at: '',
    };
    const d = recommendationToVCard(rec);
    expect(d).toMatchObject({ title: 'Omega-3', clicks: 12, conversions: 2, href: '/discover/product/p1' });
    expect(d.earned).toMatch(/4[.,]50/);
    expect(d.media).toEqual({ src: null, alt: 'Omega-3' });
  });
});
