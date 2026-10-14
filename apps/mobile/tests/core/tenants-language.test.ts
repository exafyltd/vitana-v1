/** VTID-05183 — tenants (brand, retired slugs) and language (options, flags, RTL). */
import {
  canonicalTenantSlug, tenantBrand, RETIRED_TENANT_SLUGS, COMPILED_MAXINA_FALLBACK, FALLBACK_REGISTRY,
  normalizeEntry, resolveActiveTenant, safeInternalPath, type TenantRegistry,
} from '@vitana/core/tenants';
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

  // A registry as list_public_tenants() returns it (VTID-05151): brand data, validated by normalizeEntry.
  const registry: TenantRegistry = {
    source: 'rpc',
    tenants: [
      { tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina', display_name: 'Maxina', open_signup: true, brand: { accent: '#FF7BAC', bg: '#FFF5F8', fg: '#1A1A1A' }, landing: {}, locales: null },
      normalizeEntry({ tenant_id: 't-alkalma', slug: 'alkalma', name: 'AlKalma', brand: { accent: '#3B82F6', bg: 'red; x', fg: '#1A1A1A' } })!,
    ],
  };

  it('tenantBrand without a registry: only the compiled Maxina fallback', () => {
    expect(tenantBrand('maxina')).toEqual({ brandAccent: COMPILED_MAXINA_FALLBACK.brand.accent, brandBg: COMPILED_MAXINA_FALLBACK.brand.bg, brandFg: COMPILED_MAXINA_FALLBACK.brand.fg });
    expect(tenantBrand('maxina')).toEqual(tenantBrand('maxina', FALLBACK_REGISTRY));
    expect(tenantBrand('earthlinks')).toEqual(tenantBrand('maxina'));
  });

  it('tenantBrand: unknown slug is neutral, never another tenant\'s brand', () => {
    expect(tenantBrand('nope')).toBeNull();
    expect(tenantBrand(undefined)).toBeNull();
    expect(tenantBrand('nope', registry)).toBeNull();
  });

  it('tenantBrand from a registry: validated hex only', () => {
    expect(tenantBrand('alkalma', registry)).toEqual({ brandAccent: '#3B82F6', brandBg: undefined, brandFg: '#1A1A1A' });
    expect(tenantBrand('EarthLinks', registry)?.brandAccent).toBe('#FF7BAC');
  });

  it('resolveActiveTenant: registry entry by id, else neutral', () => {
    expect(resolveActiveTenant('t-alkalma', registry, null)?.slug).toBe('alkalma');
    const neutral = resolveActiveTenant('t-x', registry, { tenant_id: 't-x', slug: 'newco', name: 'NewCo' });
    expect(neutral).toMatchObject({ slug: 'newco', name: 'NewCo', landing: {} });
    expect(neutral?.brandAccent).toBeUndefined();
    expect(resolveActiveTenant(null, registry, null)).toBeNull();
  });

  it('safeInternalPath guards open redirects', () => {
    expect(safeInternalPath('/onboarding/welcome')).toBe('/onboarding/welcome');
    expect(safeInternalPath('//evil.com')).toBe('/home');
    expect(safeInternalPath('https://evil.com')).toBe('/home');
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
