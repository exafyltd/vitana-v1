/**
 * VTID-05151 — tenant registry: validation, lookups, routing decisions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${p}` } }),
      }),
    },
  },
}));

import {
  COMPILED_MAXINA_FALLBACK,
  FALLBACK_REGISTRY,
  REGISTRY_SNAPSHOT_KEY,
  assetUrl,
  communityLandingPath,
  currentRegistrySync,
  fetchTenantBySlug,
  fetchTenantRegistry,
  findById,
  findBySlug,
  isReservedSlug,
  isTenantPortalPath,
  normalizeEntry,
  readRegistrySnapshot,
  safeHex,
  safeInternalPath,
  tenantLoginRoute,
  tenantSlugFromPath,
  writeRegistrySnapshot,
  type TenantEntry,
  type TenantRegistry,
} from './tenant-registry';

const ALKALMA: TenantEntry = {
  tenant_id: 't-alkalma',
  slug: 'alkalma',
  name: 'Alkalma',
  display_name: 'AlKalma',
  open_signup: true,
  brand: { accent: '#3B82F6' },
  landing: { intro: true, auto_switch_on_visit: true, post_login_path: '/home', oauth: true },
  locales: null,
};
const SELF_LOOP: TenantEntry = {
  ...ALKALMA,
  tenant_id: 't-loop',
  slug: 'loop-co',
  display_name: 'Loop Co',
  landing: { post_login_path: '/loop-co/welcome' },
};
const REG: TenantRegistry = { source: 'rpc', tenants: [ALKALMA, SELF_LOOP, { ...COMPILED_MAXINA_FALLBACK, tenant_id: 't-maxina' }] };

beforeEach(() => {
  rpc.mockReset();
  localStorage.clear();
});

describe('safeHex', () => {
  it('accepts #rrggbb only', () => {
    expect(safeHex('#FF7BAC')).toBe('#FF7BAC');
    expect(safeHex('#1a1a2e')).toBe('#1a1a2e');
    for (const bad of ['#fff', 'red', '#FF7BACZZ', 'url(javascript:1)', '#FF7BAC;background:red', '', null, 12]) {
      expect(safeHex(bad)).toBeUndefined();
    }
  });
});

describe('safeInternalPath (open-redirect guard)', () => {
  it('keeps an in-app path', () => {
    expect(safeInternalPath('/onboarding/welcome')).toBe('/onboarding/welcome');
    expect(safeInternalPath('/home?tab=x#y')).toBe('/home?tab=x#y');
  });

  it('replaces anything else with /home', () => {
    for (const bad of ['//evil.com', 'https://x', 'javascript:alert(1)', '/\\evil.com', 'home', '', ' //evil', '/javascript:alert(1)', '/a\u0000b', undefined, 7]) {
      expect(safeInternalPath(bad)).toBe('/home');
    }
  });
});

describe('assetUrl', () => {
  it('builds a public tenant-assets URL for a relative path in a tenant folder', () => {
    expect(assetUrl('alkalma/logo.svg')).toBe('https://example.supabase.co/storage/v1/object/public/tenant-assets/alkalma/logo.svg');
    expect(assetUrl('alkalma/logo.svg', 'alkalma')).toContain('/tenant-assets/alkalma/logo.svg');
  });

  it('rejects absolute URLs, traversal, foreign folders and junk', () => {
    for (const bad of ['https://evil.com/x.png', '//evil.com/x.png', '/alkalma/logo.svg', 'alkalma/../maxina/logo.svg', 'logo.svg', '', null]) {
      expect(assetUrl(bad)).toBeUndefined();
    }
    expect(assetUrl('maxina/logo.svg', 'alkalma')).toBeUndefined();
  });
});

describe('normalizeEntry', () => {
  it('drops malformed rows and invalid values', () => {
    expect(normalizeEntry({ slug: 'Bad Slug', tenant_id: 'x', name: 'x' })).toBeNull();
    expect(normalizeEntry(null)).toBeNull();
    const e = normalizeEntry({
      tenant_id: 't', slug: 'acme', name: 'Acme', display_name: '', open_signup: 'yes',
      brand: { accent: 'red', bg: '#FFFFFF', logo_path: 'acme/l.png', extra: 'x' },
      landing: { intro: 'true', oauth: true, tagline: { de: 'Hallo', en: 3 } },
      locales: ['de', 3],
    });
    expect(e).toEqual({
      tenant_id: 't', slug: 'acme', name: 'Acme', display_name: 'Acme', open_signup: false,
      brand: { bg: '#FFFFFF', logo_path: 'acme/l.png' },
      landing: { oauth: true, tagline: { de: 'Hallo' } },
      locales: ['de'],
    });
  });
});

describe('lookups', () => {
  it('tenantSlugFromPath reads the first segment against the registry, retired slugs mapped', () => {
    expect(tenantSlugFromPath('/alkalma', REG)).toBe('alkalma');
    expect(tenantSlugFromPath('/alkalma/confirmed?x=1', REG)).toBe('alkalma');
    expect(tenantSlugFromPath('/earthlinks/x', REG)).toBe('maxina');
    expect(tenantSlugFromPath('/maxina_support', REG)).toBeNull();
    expect(tenantSlugFromPath('/home', REG)).toBeNull();
    expect(tenantSlugFromPath('/', REG)).toBeNull();
  });

  it('findBySlug / findById', () => {
    expect(findBySlug(REG, ' AlKalma ')?.tenant_id).toBe('t-alkalma');
    expect(findBySlug(REG, 'zz')).toBeUndefined();
    expect(findById(REG, 't-alkalma')?.slug).toBe('alkalma');
    expect(findById(FALLBACK_REGISTRY, '')).toBeUndefined();
  });

  it('isTenantPortalPath covers registry tenants and retired tenants only', () => {
    expect(isTenantPortalPath('/alkalma', REG)).toBe(true);
    expect(isTenantPortalPath('/loop-co/welcome', REG)).toBe(true);
    expect(isTenantPortalPath('/earthlinks', REG)).toBe(true);
    expect(isTenantPortalPath('/home', REG)).toBe(false);
    expect(isTenantPortalPath('/', REG)).toBe(false);
  });

  it('reserved slugs come from the generated file; legacy tenants are not reserved', () => {
    expect(isReservedSlug('home')).toBe(true);
    expect(isReservedSlug('commerce')).toBe(true);
    expect(isReservedSlug('maxina')).toBe(false);
    expect(isReservedSlug('alkalma')).toBe(false);
  });
});

describe('routing decisions', () => {
  it('login route: a registry slug gets its portal, anything else the given fallback', () => {
    expect(tenantLoginRoute('alkalma', REG, '/maxina')).toBe('/alkalma');
    expect(tenantLoginRoute('zz-unknown', REG, '/maxina')).toBe('/maxina');
    expect(tenantLoginRoute(null, REG, '/')).toBe('/');
  });

  it('community landing: post_login_path, /home for an unknown tenant, never a portal path (cycle guard)', () => {
    expect(communityLandingPath('maxina', REG)).toBe('/onboarding/welcome');
    expect(communityLandingPath('alkalma', REG)).toBe('/home');
    expect(communityLandingPath('zz-unknown', REG)).toBe('/home');
    expect(communityLandingPath('loop-co', REG)).toBe('/home');
  });
});

describe('fetching and the fallback', () => {
  it('lists over GET and normalises rows', async () => {
    rpc.mockResolvedValueOnce({ data: [ALKALMA, { slug: '!!' }], error: null });
    await expect(fetchTenantRegistry()).resolves.toEqual([ALKALMA]);
    expect(rpc).toHaveBeenCalledWith('list_public_tenants', undefined, { get: true });
  });

  it('throws on error (the caller decides about the fallback)', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(fetchTenantRegistry()).rejects.toEqual({ message: 'boom' });
  });

  it('resolve_tenant over GET; unknown slug → null, never a fallback', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchTenantBySlug('zz-unknown')).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith('resolve_tenant', { p_slug: 'zz-unknown' }, { get: true });
  });

  it('the compiled Maxina fallback is used only when there is no snapshot', () => {
    expect(currentRegistrySync()).toBe(FALLBACK_REGISTRY);
    writeRegistrySnapshot([ALKALMA]);
    expect(readRegistrySnapshot()).toEqual([ALKALMA]);
    expect(currentRegistrySync()).toEqual({ source: 'snapshot', tenants: [ALKALMA] });
    // An unknown slug is unknown, with or without the fallback.
    expect(findBySlug(currentRegistrySync(), 'maxina')).toBeUndefined();
    localStorage.setItem(REGISTRY_SNAPSHOT_KEY, '{not json');
    expect(currentRegistrySync()).toBe(FALLBACK_REGISTRY);
  });
});
