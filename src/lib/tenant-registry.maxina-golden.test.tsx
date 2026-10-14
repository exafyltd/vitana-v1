/**
 * VTID-05151 — Maxina golden.
 *
 * Moving tenants from code into the registry must not change anything a
 * Maxina member or visitor sees. Every decision that used to be hardcoded for
 * Maxina is computed twice — from the live-shaped registry (the RPC row as it
 * is after the seed migration) and with the registry call failing (compiled
 * Maxina fallback, no snapshot) — and both must produce the same snapshot,
 * which equals the pre-VTID-05151 behaviour.
 *
 * Maxina's unconsumed `--brand-fg` changes from #1A1A1A (compiled) to the
 * database's #1a1a2e. That is pinned as non-rendering: nothing reads
 * `var(--brand-…)`. Slice C2 (theme tokens) must update this golden on purpose.
 */
import fs from 'fs';
import path from 'path';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.hoisted(() => ({ fail: false }));
const LIVE_MAXINA_ROW = {
  tenant_id: '6a7f0c8e-0000-4000-8000-00000000maxi',
  slug: 'maxina',
  name: 'Maxina',
  display_name: 'Maxina',
  open_signup: true,
  brand: { accent: '#FF7BAC', bg: '#FFF5F8', fg: '#1a1a2e' },
  landing: { intro: true, auto_switch_on_visit: true, post_login_path: '/onboarding/welcome', oauth: true },
  locales: null,
};
const LIVE_ALKALMA_ROW = {
  tenant_id: '6a7f0c8e-0000-4000-8000-0000000alkal',
  slug: 'alkalma',
  name: 'Alkalma',
  display_name: 'AlKalma',
  open_signup: true,
  brand: { accent: '#3B82F6', bg: '#EFF6FF', fg: '#1A1A1A' },
  landing: { intro: true, auto_switch_on_visit: true, post_login_path: '/home', oauth: true },
  locales: null,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async (fn: string) =>
      fn === 'list_public_tenants' && !rpcMock.fail
        ? { data: [LIVE_ALKALMA_ROW, LIVE_MAXINA_ROW], error: null }
        : { data: null, error: { message: 'function public.list_public_tenants() does not exist' } },
    storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: p } }) }) },
  },
}));

import { ensureTenantRegistry } from '@/hooks/useTenantRegistry';
import { resolveActiveTenant } from '@/lib/tenant-registry';
import { resolveLoginRoute } from '@/lib/guest-auth';
import { getInstantTenantName } from '@/lib/tenant-display';
import {
  communityLandingPath,
  currentRegistrySync,
  findBySlug,
  isTenantPortalPath,
  logoClickTarget,
  sidebarTenantName,
  tenantLoginRoute,
  tenantSlugFromPath,
  type TenantRegistry,
} from '@/lib/tenant-registry';

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

async function maxinaSnapshot(source: 'rpc' | 'failure') {
  localStorage.clear();
  localStorage.setItem('tenant_slug', 'maxina');
  rpcMock.fail = source === 'failure';
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const reg: TenantRegistry = await ensureTenantRegistry(qc);
  // Synchronous callers read the snapshot the registry hook writes on success
  // (none on failure → compiled fallback).
  const sync = currentRegistrySync();
  const row = { tenant_id: LIVE_MAXINA_ROW.tenant_id, slug: 'maxina', name: 'Maxina' };
  const t = resolveActiveTenant(row.tenant_id, reg, row);
  const loginRoute = tenantLoginRoute('maxina', sync, '/');
  const detectorSlug = tenantSlugFromPath('/maxina', reg);
  return {
    registrySource: reg.source === 'rpc' ? 'rpc' : 'fallback',
    tenant: { id: t?.id, name: t?.name, slug: t?.slug, displayName: t?.displayName },
    instantName: getInstantTenantName('/maxina'),
    appLayout: {
      displayName: sidebarTenantName({ pathname: '/maxina', storedSlug: 'maxina', tenantName: t?.name }, reg),
      displayNameOffPortal: sidebarTenantName({ pathname: '/home', storedSlug: 'maxina', tenantName: t?.name }, reg),
      logoClick: logoClickTarget(t?.slug, reg),
    },
    authGuard: {
      loginRoute,
      intro: findBySlug(sync, loginRoute.slice(1))?.landing.intro ? `/_intro/${loginRoute.slice(1)}` : loginRoute,
    },
    smartRouting: {
      communityRedirect: communityLandingPath(t?.slug, reg),
      logout: tenantLoginRoute('maxina', reg, '/'),
      portalPaths: ['/maxina', '/maxina/confirmed', '/maxina/app'].filter((p) => isTenantPortalPath(p, reg)),
    },
    resolveLoginRoute: resolveLoginRoute(),
    tenantDetector: {
      slug: detectorSlug,
      autoSwitch: findBySlug(reg, detectorSlug)?.landing.auto_switch_on_visit === true,
    },
  };
}

const GOLDEN = {
  tenant: { id: '', name: 'Maxina', slug: 'maxina', displayName: 'Maxina' },
  instantName: 'Maxina',
  appLayout: { displayName: 'Maxina', displayNameOffPortal: 'Maxina', logoClick: '/maxina' },
  authGuard: { loginRoute: '/maxina', intro: '/_intro/maxina' },
  smartRouting: {
    communityRedirect: '/onboarding/welcome',
    logout: '/maxina',
    portalPaths: ['/maxina', '/maxina/confirmed', '/maxina/app'],
  },
  resolveLoginRoute: '/maxina',
  tenantDetector: { slug: 'maxina', autoSwitch: true },
};

describe('VTID-05151 — Maxina golden', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('the live-shaped registry reproduces today\'s Maxina behaviour', async () => {
    const snap = await maxinaSnapshot('rpc');
    expect(snap.registrySource).toBe('rpc');
    const { registrySource: _src, ...rest } = snap;
    expect(rest).toEqual(GOLDEN);
  });

  it('a failed registry call (compiled fallback) reproduces exactly the same', async () => {
    const snap = await maxinaSnapshot('failure');
    expect(snap.registrySource).toBe('fallback');
    const { registrySource: _src, ...rest } = snap;
    expect(rest).toEqual(GOLDEN);
  });

  it('the failed call is logged, not silent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await maxinaSnapshot('failure');
    expect(warn).toHaveBeenCalledWith('[tenant-registry] fallback', expect.anything());
  });

  it('AuthGuard, useSmartRouting, TenantDetector and AppLayout compute these through the registry helpers', () => {
    const authGuard = read('components/AuthGuard.tsx');
    expect(authGuard).toContain("return tenantLoginRoute(slug, currentRegistrySync(), '/');");
    expect(authGuard).toContain('if (entry?.landing.intro) {');
    const smart = read('hooks/useSmartRouting.tsx');
    expect(smart).toContain('communityLandingPath(tenant.slug, registry)');
    expect(smart).toContain('return tenantLoginRoute(tenantSlug, registry, "/");');
    expect(smart).not.toMatch(/['"]\/(maxina|alkalma)['"]/);
    const detector = read('components/TenantDetector.tsx');
    expect(detector).toContain('landing.auto_switch_on_visit === true');
    const layout = read('components/AppLayout.tsx');
    expect(layout).toContain('navigate(logoClickTarget(tenant?.slug, tenantRegistry));');
    expect(layout).toContain('sidebarTenantName(');
  });

  it('App.tsx still maps /maxina to MaxinaPortal and /maxina/confirmed to MaxinaConfirmed', () => {
    const app = read('App.tsx');
    expect(app).toContain('<Route path="/maxina" element={<MaxinaPortal />} />');
    expect(app).toContain('<Route path="/maxina/confirmed" element={<MaxinaConfirmed />} />');
    expect(app).toContain('const MaxinaPortal = lazy(() => import("./pages/portals/MaxinaPortal"));');
  });

  it('nothing consumes var(--brand-*), so the --brand-fg value change does not render (C2 changes this on purpose)', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|css|scss)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('var(--brand-')) hits.push(path.relative(ROOT, p));
      }
    };
    walk(SRC);
    for (const f of ['tailwind.config.ts', 'index.html']) {
      if (fs.existsSync(path.join(ROOT, f)) && fs.readFileSync(path.join(ROOT, f), 'utf8').includes('var(--brand-')) hits.push(f);
    }
    // This test file names the token in a string literal only.
    expect(hits.filter((h) => !h.endsWith('tenant-registry.maxina-golden.test.tsx'))).toEqual([]);
  });
});
