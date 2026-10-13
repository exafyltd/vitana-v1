import { describe, it, expect, beforeEach } from 'vitest';
import { getInstantTenantName } from './tenant-display';
import { REGISTRY_SNAPSHOT_KEY } from './tenant-registry';

// VTID-05151: names come from the registry snapshot that useTenantRegistry
// writes; without a snapshot only the compiled Maxina fallback is known.
const SNAPSHOT = {
  at: 0,
  tenants: [
    { tenant_id: 't-alkalma', slug: 'alkalma', name: 'Alkalma', display_name: 'AlKalma', open_signup: true, brand: {}, landing: {}, locales: null },
    { tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina', display_name: 'Maxina', open_signup: true, brand: {}, landing: {}, locales: null },
  ],
};

describe('getInstantTenantName', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(REGISTRY_SNAPSHOT_KEY, JSON.stringify(SNAPSHOT));
  });

  it('resolves the tenant from the URL path first', () => {
    expect(getInstantTenantName('/maxina/home')).toBe('Maxina');
    expect(getInstantTenantName('/alkalma/settings')).toBe('AlKalma');
  });

  it('falls back to the persisted tenant slug from localStorage', () => {
    localStorage.setItem('tenant_slug', 'maxina');
    expect(getInstantTenantName('/some/other/path')).toBe('Maxina');
  });

  it('resolves a persisted retired slug (earthlinks) to Maxina — VTID-04836', () => {
    localStorage.setItem('tenant_slug', 'earthlinks');
    expect(getInstantTenantName('/some/other/path')).toBe('Maxina');
  });

  it('ignores an unknown persisted slug', () => {
    localStorage.setItem('tenant_slug', 'not-a-tenant');
    expect(getInstantTenantName('/some/other/path')).toBe('');
  });

  it('never shows a wrong brand: returns empty string when nothing matches', () => {
    expect(getInstantTenantName('/')).toBe('');
  });

  it('without a snapshot knows only the compiled Maxina — never names another tenant Maxina', () => {
    localStorage.removeItem(REGISTRY_SNAPSHOT_KEY);
    expect(getInstantTenantName('/maxina')).toBe('Maxina');
    expect(getInstantTenantName('/alkalma')).toBe('');
    expect(getInstantTenantName('/maxina_support')).toBe('');
  });
});
