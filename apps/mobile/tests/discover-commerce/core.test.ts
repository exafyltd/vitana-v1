/**
 * VTID-05510 — the pure Discover helpers generated into `@vitana/core/discover`
 * (packages/core/extract.json) behave like the web functions, and the native
 * `getPersonalizedReason` keeps the web's three-step rule.
 */
import {
  BATCHED_TYPES,
  CART_PRODUCT_UUID_RE,
  FETCH_LIMIT,
  formatPrice,
  hasPersonalizationSignal,
  HOLD_THRESHOLD_MS,
  ITEMS_PER_SECTION,
  MOBILE_DISCOVER_CATEGORIES,
  SECTION_CONFIGS,
  SECTION_META,
  shopFeedQueryKeys,
  toEurCents,
  toneForGradient,
} from '../../src/ports/discover';
import { getPersonalizedReason } from '../../src/screens/discover/reason';

describe('@vitana/core/discover', () => {
  it('formatPrice converts to EUR and formats; toEurCents uses the rate table', () => {
    expect(toEurCents(1080, 'usd')).toBe(1000);
    expect(toEurCents(500, 'XYZ')).toBe(500);
    expect(formatPrice(null, 'EUR')).toBe('');
    expect(formatPrice(1999, null)).toBe('');
    expect(formatPrice(1999, 'EUR')).toMatch(/19[.,]99/);
  });

  it('the badge rule and the reason fall back from signal → category → generic', () => {
    const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
    expect(hasPersonalizationSignal({ match_reasons: [{ kind: 'g', text: 'x' }], subcategory: null })).toBe(true);
    expect(hasPersonalizationSignal({ rank_reasons: [], subcategory: null })).toBe(false);
    expect(getPersonalizedReason({ rank_reasons: ['Top seller'], subcategory: null }, t)).toBe('Top seller');
    expect(getPersonalizedReason({ subcategory: 'essential-fatty-acids' }, t)).toBe('discover.reasonForCategory:{"category":"discover.subcategories.essentialFattyAcids"}');
    expect(getPersonalizedReason({ subcategory: 'unknown' }, t)).toBe('discover.reasonGeneric');
  });

  it('collections, categories, cart id rule and shop constants', () => {
    expect(Object.keys(SECTION_CONFIGS)).toEqual(['supplements', 'skincare', 'health-tests']);
    expect(SECTION_CONFIGS.supplements[0]).toEqual({ key: 'longevity', icon: 'Clock', gradient: 'from-violet-500 to-purple-600', i18nKey: 'longevity' });
    expect([ITEMS_PER_SECTION, FETCH_LIMIT, HOLD_THRESHOLD_MS]).toEqual([6, 50, 2000]);
    expect(SECTION_META.hormones.category).toBe('health-tests');
    expect(MOBILE_DISCOVER_CATEGORIES.map((c) => c.id)).toEqual(['sleep', 'nutrition', 'movement', 'mind', 'supplements', 'experts']);
    expect(CART_PRODUCT_UUID_RE.test('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(CART_PRODUCT_UUID_RE.test('42')).toBe(false);
    expect([...BATCHED_TYPES]).toEqual(['impression', 'hold_2s']);
    expect(shopFeedQueryKeys.feed()).toEqual(['shop-feed', 'feed', 10]);
    expect([toneForGradient('from-violet-500 to-purple-600'), toneForGradient('from-sky-500'), toneForGradient(null)]).toEqual(['category-2', 'category-7', 'category-3']);
  });
});
