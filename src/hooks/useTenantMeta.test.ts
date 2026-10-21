/**
 * VTID-05242 (mt-frontend-brand/brand-surface): member-facing brand values
 * follow the active tenant, Maxina is the compiled fallback, and Maxina's own
 * title/favicon are never touched.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TenantEntry, TenantRegistry } from '@/lib/tenant-registry';

const h = vi.hoisted(() => ({
  tenantSlug: null as string | null,
  registry: null as unknown,
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenantSafe: () => (h.tenantSlug ? { tenant: { slug: h.tenantSlug } } : undefined),
}));
vi.mock('@/hooks/useTenantRegistry', () => ({
  useTenantRegistry: () => h.registry,
}));

import {
  MAXINA_META,
  MAXINA_SLUG,
  activeTenantSlug,
  applyTenantMeta,
  hostTenantSlug,
  restoreTenantMeta,
  tenantMetaFor,
  tenantPortalFor,
  useTenantMeta,
} from '@/hooks/useTenantMeta';

function entry(slug: string, extra: Partial<TenantEntry> = {}): TenantEntry {
  return {
    tenant_id: `id-${slug}`,
    slug,
    name: slug,
    display_name: slug[0].toUpperCase() + slug.slice(1),
    open_signup: true,
    brand: {},
    landing: {},
    locales: null,
    ...extra,
  };
}

const REG: TenantRegistry = {
  source: 'rpc',
  tenants: [
    entry('maxina', { display_name: 'Maxina', brand: { favicon_path: 'maxina/favicon.png', logo_path: 'maxina/logo.svg' } }),
    entry('acme', { display_name: 'Acme Health', brand: { favicon_path: 'acme/favicon.png', logo_path: 'acme/logo.svg' } }),
    entry('nologo', { display_name: 'No Logo' }),
  ],
};

const SRC = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

function resetHead() {
  document.head.innerHTML =
    '<link rel="icon" type="image/x-icon" href="/favicon.ico" />' +
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />' +
    '<meta property="og:site_name" content="MAXINA" />' +
    '<meta property="og:title" content="Original OG" />';
  document.title = 'Page title from SEO';
}

const icons = () => Array.from(document.querySelectorAll('link[rel="icon"]')).map((l) => l.getAttribute('href'));
const og = () => Array.from(document.querySelectorAll('meta[property^="og:"]')).map((m) => m.getAttribute('content'));

beforeEach(() => {
  resetHead();
  h.tenantSlug = null;
  h.registry = REG;
});
afterEach(() => restoreTenantMeta());

describe('activeTenantSlug (replaces the literal maxina)', () => {
  it('prefers the active tenant', () => {
    expect(activeTenantSlug({ tenantSlug: 'acme', candidates: ['other'], hostname: 'vitanaland.com' })).toBe('acme');
  });
  it('then the caller candidates (e.g. the persisted slug)', () => {
    expect(activeTenantSlug({ tenantSlug: null, candidates: [null, 'acme'] })).toBe('acme');
  });
  it('then the custom-domain mapping', () => {
    expect(hostTenantSlug('vitanaland.com')).toBe('maxina');
    expect(activeTenantSlug({ hostname: 'vitanaland.com' })).toBe('maxina');
  });
  it('falls back to Maxina', () => {
    expect(activeTenantSlug({})).toBe(MAXINA_SLUG);
    expect(activeTenantSlug({ hostname: 'preview-aws.vitanaland.com' })).toBe('maxina');
  });
  it('skips malformed, reserved and retired values', () => {
    expect(activeTenantSlug({ tenantSlug: '../evil', candidates: ['Foo Bar', 'admin'] })).toBe('maxina');
    expect(activeTenantSlug({ candidates: ['earthlinks'] })).toBe('maxina');
  });
});

describe('tenantPortalFor (voucher redemption navigate target + logo)', () => {
  it('Maxina keeps its compiled portal path and logo', () => {
    expect(tenantPortalFor('maxina', REG)).toEqual({
      slug: 'maxina', isMaxina: true, portalPath: '/maxina', brandName: '', logoUrl: '/images/maxina-logo.png',
    });
  });
  it('an unknown slug falls back to the Maxina portal', () => {
    expect(tenantPortalFor('ghost', REG).portalPath).toBe('/maxina');
    expect(tenantPortalFor('ghost', REG).isMaxina).toBe(true);
  });
  it('a registry tenant gets its own portal, name and logo', () => {
    const p = tenantPortalFor('acme', REG);
    expect(p.portalPath).toBe('/acme');
    expect(p.isMaxina).toBe(false);
    expect(p.brandName).toBe('Acme Health');
    expect(p.logoUrl).toContain('acme/logo.svg');
  });
  it('a tenant without a logo shows none (never another tenant\'s logo)', () => {
    expect(tenantPortalFor('nologo', REG).logoUrl).toBeNull();
  });
});

describe('tenantMetaFor', () => {
  it('Maxina and no tenant are the compiled values, not an override', () => {
    expect(tenantMetaFor('maxina', REG)).toEqual({ ...MAXINA_META, isOverride: false });
    expect(tenantMetaFor(null, REG)).toEqual({ ...MAXINA_META, isOverride: false });
    expect(tenantMetaFor('ghost', REG).isOverride).toBe(false);
  });
  it('a registry tenant overrides title and favicon', () => {
    const m = tenantMetaFor('acme', REG);
    expect(m.isOverride).toBe(true);
    expect(m.title).toBe('Acme Health');
    expect(m.faviconHref).toContain('acme/favicon.png');
  });
  it('a tenant without a favicon keeps the compiled favicon', () => {
    expect(tenantMetaFor('nologo', REG).faviconHref).toBe(MAXINA_META.faviconHref);
  });
});

describe('applyTenantMeta / restoreTenantMeta', () => {
  it('sets title + every favicon link, never an OG tag, and restores both', () => {
    applyTenantMeta(tenantMetaFor('acme', REG));
    expect(document.title).toBe('Acme Health');
    expect(icons().every((x) => x?.includes('acme/favicon.png'))).toBe(true);
    expect(og()).toEqual(['MAXINA', 'Original OG']);
    restoreTenantMeta();
    expect(document.title).toBe('Page title from SEO');
    expect(icons()).toEqual(['/favicon.ico', '/favicon-32x32.png']);
  });
});

describe('useTenantMeta', () => {
  it('Maxina: title and favicon stay exactly as the page set them', () => {
    h.tenantSlug = 'maxina';
    renderHook(() => useTenantMeta());
    expect(document.title).toBe('Page title from SEO');
    expect(icons()).toEqual(['/favicon.ico', '/favicon-32x32.png']);
  });
  it('no active tenant: nothing is written', () => {
    renderHook(() => useTenantMeta());
    expect(document.title).toBe('Page title from SEO');
    expect(icons()).toEqual(['/favicon.ico', '/favicon-32x32.png']);
  });
  it('a registry tenant sets title + favicon (not OG); leaving it restores the Maxina values', () => {
    h.tenantSlug = 'acme';
    const { rerender } = renderHook(() => useTenantMeta());
    expect(document.title).toBe('Acme Health');
    expect(icons()[0]).toContain('acme/favicon.png');
    expect(og()).toEqual(['MAXINA', 'Original OG']);
    h.tenantSlug = 'maxina';
    rerender();
    expect(document.title).toBe('Page title from SEO');
    expect(icons()).toEqual(['/favicon.ico', '/favicon-32x32.png']);
  });
});

describe('wiring (source checks)', () => {
  it('AppHooksInitializer mounts useTenantMeta — one call, no new route or element', () => {
    const app = SRC('App.tsx');
    expect(app).toContain('import { useTenantMeta } from "@/hooks/useTenantMeta";');
    const start = app.indexOf('const AppHooksInitializer = () => {');
    const body = app.slice(start, app.indexOf('\n};', start));
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain('useTenantMeta();');
    expect(app.split('useTenantMeta();').length - 1).toBe(1);
  });
  it('voucher redemption navigates to the active tenant portal, not a literal /maxina', () => {
    const redeem = SRC('pages/RedeemVoucher.tsx');
    const landing = SRC('components/voucher/RedemptionLanding.tsx');
    expect(redeem).not.toContain('navigate("/maxina")');
    expect(redeem).toContain('navigate(portal.portalPath)');
    expect(landing).not.toMatch(/navigate\(`\/maxina/);
    expect(landing).toContain('navigate(`${portal.portalPath}?redirectTo=${redirectTo}`)');
    expect(landing).not.toContain('src="/images/maxina-logo.png"');
    expect(landing).toContain('src={portal.logoUrl}');
  });
  it('the AuthGuard OAuth retry derives its redirect base from the active tenant slug', () => {
    const guard = SRC('components/AuthGuard.tsx');
    expect(guard).not.toContain("|| 'maxina'");
    expect(guard).toContain("redirectTo: window.location.origin + '/' + retrySlug");
    expect(guard).toContain('tenantSlug: tenantCtx?.tenant?.slug');
  });
  it('useTenantMeta never touches OG / <meta> tags', () => {
    const hook = SRC('hooks/useTenantMeta.ts');
    expect(hook).not.toMatch(/querySelector[^\n]*meta\[/);
    expect(hook).not.toContain('property="og');
  });
});

describe('i18n (DE first, du-form, EN mirror)', () => {
  const de = JSON.parse(SRC('i18n/de/tenantBrand.json')).tenantBrand;
  const en = JSON.parse(SRC('i18n/en/tenantBrand.json')).tenantBrand;
  // `_`-prefixed keys (e.g. `_pending_review`) are i18n pipeline metadata added by the
  // EN pivot propagation bot (VTID-03509), not user-visible strings.
  const userKeys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => !k.startsWith('_')).sort();
  it('every key exists in DE and EN with the {brand} placeholder', () => {
    expect(userKeys(en)).toEqual(userKeys(de));
    for (const k of Object.keys(de)) {
      expect(de[k]).toContain('{brand}');
      expect(en[k]).toContain('{brand}');
      expect(de[k]).not.toMatch(/\b(Sie|Ihr|Ihnen|Ihre)\b/);
    }
  });
});
