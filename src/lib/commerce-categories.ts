/**
 * Commerce Portal business categories (VTID follow-up to VTID-03974).
 *
 * The database only constrains the coarse `commerce_vertical` axis
 * (`'health' | 'general'`, CHECK constraint on `partner_organizations` —
 * gates whether the stricter health-data pipeline/`partner_registry`
 * bridge applies). The category a merchant actually picks is stored in the
 * pre-existing, unconstrained `org_type` free-text column, so adding a new
 * category here is a frontend-only change — no migration.
 *
 * Fitness, lifestyle, textiles, supplements and longevity travel are all
 * `'general'`: real product categories, but not subject to the health
 * vertical's rigorous rules (owner's own framing).
 */
export type CommerceVertical = 'health' | 'general';

export interface CommerceCategory {
  /** Stored verbatim in `partner_organizations.org_type`. */
  key: string;
  labelKey: string;
  vertical: CommerceVertical;
}

export const COMMERCE_CATEGORIES: CommerceCategory[] = [
  { key: 'health_medical', labelKey: 'screens.commerceportal.orgOnboarding.categoryHealth', vertical: 'health' },
  { key: 'fitness_wellness', labelKey: 'screens.commerceportal.orgOnboarding.categoryFitness', vertical: 'general' },
  { key: 'lifestyle', labelKey: 'screens.commerceportal.orgOnboarding.categoryLifestyle', vertical: 'general' },
  { key: 'textiles_apparel', labelKey: 'screens.commerceportal.orgOnboarding.categoryTextiles', vertical: 'general' },
  { key: 'supplements_nutrition', labelKey: 'screens.commerceportal.orgOnboarding.categorySupplements', vertical: 'general' },
  { key: 'travel_tourism', labelKey: 'screens.commerceportal.orgOnboarding.categoryTravel', vertical: 'general' },
  { key: 'general_commerce', labelKey: 'screens.commerceportal.orgOnboarding.categoryGeneral', vertical: 'general' },
];

export function findCommerceCategory(key: string): CommerceCategory | undefined {
  return COMMERCE_CATEGORIES.find((c) => c.key === key);
}

/** `org_type` was free text before this category list existed — never throws on an unknown value. */
export function commerceVerticalForCategory(key: string): CommerceVertical {
  return findCommerceCategory(key)?.vertical ?? 'general';
}
