import { t } from '@/lib/i18n-toast';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';

// Mirrors CategoryShopSections.tsx's SECTION_ORDER key mapping — kept as its
// own small map here so this util has no import dependency on that component.
const SUBCATEGORY_I18N_KEY: Record<string, string> = {
  longevity: 'longevity',
  adaptogens: 'adaptogens',
  vitamins: 'vitamins',
  'essential-fatty-acids': 'essentialFattyAcids',
  minerals: 'minerals',
  immunity: 'immunity',
  beauty: 'beauty',
  nootropics: 'nootropics',
  performance: 'performance',
  antioxidants: 'antioxidants',
  'face-care': 'faceCare',
  makeup: 'makeup',
  'hair-care': 'hairCare',
  'body-care': 'bodyCare',
  fragrance: 'fragrance',
  'sun-care': 'sunCare',
};

type ReasonSource = Pick<MarketplaceProduct, 'match_reasons' | 'rank_reasons' | 'subcategory'>;

/**
 * A short, human line explaining why a product is being recommended.
 * Prefers the backend's real personalization signal (match_reasons /
 * rank_reasons); falls back to a category-based line, then a generic one —
 * so the explanation area is never blank (the empty purple strip bug).
 */
export function getPersonalizedReason(product: ReasonSource): string {
  const explicit = product.match_reasons?.[0]?.text || product.rank_reasons?.[0];
  if (explicit) return explicit;

  const i18nKey = product.subcategory ? SUBCATEGORY_I18N_KEY[product.subcategory] : undefined;
  if (i18nKey) {
    const category = t(`discover.subcategories.${i18nKey}`);
    return t('discover.reasonForCategory', { category });
  }

  return t('discover.reasonGeneric');
}

/** Whether the recommendation badge should read "Vitana Pick" (real signal) vs "Popular" (no signal). */
export function hasPersonalizationSignal(product: ReasonSource): boolean {
  return Boolean(product.match_reasons?.[0]?.text || product.rank_reasons?.[0]);
}
