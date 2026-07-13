import { describe, it, expect } from 'vitest';
import { DOMAIN_TENANT_MAP } from './domain-tenant-mapping';

describe('DOMAIN_TENANT_MAP', () => {
  it('maps all vitanaland.com variants to the maxina tenant', () => {
    expect(DOMAIN_TENANT_MAP['vitanaland.com']).toBe('maxina');
    expect(DOMAIN_TENANT_MAP['www.vitanaland.com']).toBe('maxina');
    expect(DOMAIN_TENANT_MAP['e.vitanaland.com']).toBe('maxina');
  });

  it('contains only lowercase hostnames (matching is case-sensitive)', () => {
    for (const host of Object.keys(DOMAIN_TENANT_MAP)) {
      expect(host).toBe(host.toLowerCase());
    }
  });

  it('maps every domain to a known tenant slug', () => {
    const knownSlugs = new Set(['maxina', 'earthlinks', 'alkalma']);
    for (const slug of Object.values(DOMAIN_TENANT_MAP)) {
      expect(knownSlugs.has(slug)).toBe(true);
    }
  });
});
