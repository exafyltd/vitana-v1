/** VTID-05183 — tenants (brand, retired slugs) and language (options, flags, RTL). */
import { canonicalTenantSlug, tenantBrand, TENANT_CONFIGS, RETIRED_TENANT_SLUGS } from '@vitana/core/tenants';
import { languageOptions, LOCALE_PRESENTATION, flagAsset, isRtlLanguage, RTL_BASE_LANGUAGES } from '@vitana/core/language';
import { LOCALES } from '../../src/i18n';

describe('tenants', () => {
  it('retired slugs map to their successor', () => {
    expect(canonicalTenantSlug('earthlinks')).toBe('maxina');
    expect(canonicalTenantSlug('EarthLings')).toBe('maxina');
    expect(canonicalTenantSlug('alkalma')).toBe('alkalma');
    expect(canonicalTenantSlug(null)).toBeNull();
    expect(Object.isFrozen(RETIRED_TENANT_SLUGS)).toBe(true);
  });

  it('tenantBrand: known, retired and unknown slugs', () => {
    expect(tenantBrand('alkalma').brandAccent).toBe('#3B82F6');
    expect(tenantBrand('maxina')).toEqual({ brandAccent: TENANT_CONFIGS.maxina.brandAccent, brandBg: TENANT_CONFIGS.maxina.brandBg, brandFg: TENANT_CONFIGS.maxina.brandFg });
    expect(tenantBrand('earthlinks')).toEqual(tenantBrand('maxina'));
    expect(tenantBrand('nope')).toEqual(tenantBrand('maxina'));
    expect(tenantBrand(undefined)).toEqual(tenantBrand('maxina'));
  });
});

describe('language', () => {
  it('the ga language options are the 11 Wave 0 locales', () => {
    const ga = languageOptions.filter((o) => o.status === 'ga').map((o) => o.value.split('-')[0]);
    expect([...ga].sort()).toEqual([...LOCALES].sort());
  });

  it('every flag resolves to a bundled asset', () => {
    const entries = Object.entries(LOCALE_PRESENTATION);
    expect(entries.length).toBeGreaterThanOrEqual(11);
    for (const [locale, p] of entries) {
      expect(p.flag).toMatch(/^src\/assets\/flags\/[a-z]+\.png$/);
      expect(flagAsset(p.flag)).toBeDefined();
      expect(p.endonym).toBeTruthy();
      expect(locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
    expect(flagAsset('src/assets/flags/none.png')).toBeUndefined();
  });

  it('RTL follows the base language', () => {
    expect(isRtlLanguage('ar-SA')).toBe(true);
    expect(isRtlLanguage('ar-XA')).toBe(true);
    expect(isRtlLanguage('de-DE')).toBe(false);
    expect(isRtlLanguage(null)).toBe(false);
    expect(RTL_BASE_LANGUAGES.has('ar')).toBe(true);
  });
});
