/** VTID-04793 — supplier-facing wording and order; stored values unchanged. */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { COMMERCE_CATEGORIES } from './commerce-categories';

const en = JSON.parse(readFileSync(resolve(__dirname, '../i18n/en/screens.json'), 'utf8')).screens.commerceportal.orgOnboarding;

describe('registration categories', () => {
  it('keep their stored org_type values', () => {
    expect(COMMERCE_CATEGORIES.map((c) => c.key).sort()).toEqual(
      ['fitness_wellness', 'general_commerce', 'health_medical', 'lifestyle', 'supplements_nutrition', 'textiles_apparel', 'travel_tourism'],
    );
  });
  it('read in the supplier-facing order and wording', () => {
    const label = (k: string) => en[k.split('.').pop() as string];
    expect(COMMERCE_CATEGORIES.map((c) => label(c.labelKey))).toEqual([
      'Health & medical', 'Fitness & wellness', 'Supplements & nutrition', 'Lifestyle',
      'Fashion & apparel', 'Travel & experiences', 'Other products & services',
    ]);
  });
});
