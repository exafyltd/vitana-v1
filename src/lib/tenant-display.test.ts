import { describe, it, expect } from 'vitest';
import { getInstantTenantName } from './tenant-display';

describe('getInstantTenantName', () => {
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
});
