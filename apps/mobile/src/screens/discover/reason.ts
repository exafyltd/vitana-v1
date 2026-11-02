/**
 * VTID-05510 — `getPersonalizedReason` of the web `src/lib/discover-reason.ts`
 * over the native `t()`. The web function calls the web `t()` (class B), so
 * only its pure parts are generated into core (`SUBCATEGORY_I18N_KEY`,
 * `hasPersonalizationSignal`); the three-step rule is the same: the backend's
 * own reason, else the category line, else the generic line.
 */
import { SUBCATEGORY_I18N_KEY, hasPersonalizationSignal, type ReasonSource } from '../../ports/discover';

export { hasPersonalizationSignal };

export function getPersonalizedReason(product: ReasonSource, t: (key: string, params?: Record<string, string | number>) => string): string {
  const explicit = product.match_reasons?.[0]?.text || product.rank_reasons?.[0];
  if (explicit) return explicit;
  const i18nKey = product.subcategory ? SUBCATEGORY_I18N_KEY[product.subcategory] : undefined;
  if (i18nKey) return t('discover.reasonForCategory', { category: t(`discover.subcategories.${i18nKey}`) });
  return t('discover.reasonGeneric');
}

/** The card badge: "Vitana Pick" with a real signal, else "Popular". */
export function badgeFor(product: ReasonSource, t: (key: string) => string): string {
  return hasPersonalizationSignal(product) ? t('discover.vitanaPickBadge') : t('discover.popularBadge');
}
