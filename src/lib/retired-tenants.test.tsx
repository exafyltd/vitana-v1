/**
 * VTID-04836 — the earthlinks tenant is retired (merged into maxina by
 * platform migration 20260427120000_vtid_01985_earthlinks_to_maxina_cleanup).
 *
 *  1. No compiled tenant includes earthlinks (VTID-05151 removed the
 *     TenantType union entirely; the registry fallback is Maxina only).
 *  2. Old /earthlinks URLs redirect to the Maxina equivalent, keeping the
 *     rest of the path, the query and the hash.
 *  3. A persisted 'earthlinks' slug resolves to maxina (and is rewritten).
 *  4. A record still tagged 'earthlinks' renders with the Maxina theme.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { extractSpaRoutes } from '../../scripts/nav/spa-routes.mjs';
import { COMPILED_MAXINA_FALLBACK, FALLBACK_REGISTRY, findBySlug } from '@/lib/tenant-registry';
import { RetiredTenantRedirect } from '@/components/RetiredTenantRedirect';
import { resolveTicketTenant } from '@/components/tickets/ticket-tenant';
import { resolveLoginRoute } from '@/lib/guest-auth';
import { getInstantTenantName } from '@/lib/tenant-display';
import {
  canonicalTenantSlug,
  migrateStoredTenantSlugs,
  readStoredTenantSlug,
  retiredTenantRedirectPath,
} from './retired-tenants';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('VTID-04836 — no compiled earthlinks tenant (VTID-05151: no compiled tenant list at all)', () => {
  it('useTenant has no TenantType union and no compiled tenant configs', () => {
    const useTenant = read('hooks/useTenant.tsx');
    expect(useTenant).not.toMatch(/export type TenantType\b/);
    expect(useTenant).not.toMatch(/TENANT_CONFIGS/);
    expect(useTenant).not.toMatch(/^\s*earthlinks:\s*\{/m);
    expect(useTenant).not.toMatch(/['"]earthlinks['"]/);
  });

  it('the compiled registry fallback is Maxina only — never earthlinks', () => {
    expect(FALLBACK_REGISTRY.tenants.map((t) => t.slug)).toEqual(['maxina']);
    expect(COMPILED_MAXINA_FALLBACK.slug).toBe('maxina');
    // A retired slug resolves to its successor, never to its own entry.
    expect(findBySlug(FALLBACK_REGISTRY, 'earthlinks')?.slug).toBe('maxina');
  });
});

describe('VTID-04836 — /earthlinks redirects', () => {
  it('maps every retired-tenant path to the Maxina equivalent', () => {
    expect(retiredTenantRedirectPath('/earthlinks')).toBe('/maxina');
    expect(retiredTenantRedirectPath('/earthlinks/')).toBe('/maxina');
    expect(retiredTenantRedirectPath('/earthlinks/x')).toBe('/maxina/x');
    expect(retiredTenantRedirectPath('/earthlinks/confirmed', '?confirmed=true', '#top'))
      .toBe('/maxina/confirmed?confirmed=true#top');
    expect(retiredTenantRedirectPath('/Earthlinks/a/b')).toBe('/maxina/a/b');
  });

  it('leaves live tenants and look-alike paths alone', () => {
    expect(retiredTenantRedirectPath('/maxina')).toBeNull();
    expect(retiredTenantRedirectPath('/alkalma/confirmed')).toBeNull();
    expect(retiredTenantRedirectPath('/earthlinksfoo')).toBeNull();
    expect(retiredTenantRedirectPath('/')).toBeNull();
  });

  function LocationProbe() {
    const { pathname, search, hash } = useLocation();
    return <div data-testid="loc">{`${pathname}${search}${hash}`}</div>;
  }

  function renderAt(url: string) {
    const view = render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/earthlinks/*" element={<RetiredTenantRedirect />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const loc = screen.getByTestId('loc').textContent;
    view.unmount();
    return loc;
  }

  it('RetiredTenantRedirect sends /earthlinks/x to /maxina/x', () => {
    expect(renderAt('/earthlinks/x')).toBe('/maxina/x');
  });

  it('RetiredTenantRedirect sends the login portal and keeps the query', () => {
    expect(renderAt('/earthlinks')).toBe('/maxina');
    expect(renderAt('/earthlinks?redirectTo=%2Fhome')).toBe('/maxina?redirectTo=%2Fhome');
    expect(renderAt('/earthlinks/confirmed?confirmed=true')).toBe('/maxina/confirmed?confirmed=true');
  });

  it('App.tsx mounts the redirect on /earthlinks/* and no Earthlinks page', () => {
    const app = read('App.tsx');
    const routes = extractSpaRoutes(app) as Array<{ path: string }>;
    const earthlinks = routes.filter((r) => r.path.startsWith('/earthlinks'));
    expect(earthlinks.map((r) => r.path)).toEqual(['/earthlinks/*']);
    expect(app).toContain('<Route path="/earthlinks/*" element={<RetiredTenantRedirect />} />');
    expect(app).not.toMatch(/EarthlinksPortal|EarthlinksConfirmed/);
  });
});

describe('VTID-04836 — stored earthlinks slug', () => {
  beforeEach(() => localStorage.clear());

  it('canonicalTenantSlug maps retired slugs and leaves the rest', () => {
    expect(canonicalTenantSlug('earthlinks')).toBe('maxina');
    expect(canonicalTenantSlug('earthlings')).toBe('maxina');
    expect(canonicalTenantSlug('alkalma')).toBe('alkalma');
    expect(canonicalTenantSlug(null)).toBeNull();
  });

  it('a stored earthlinks slug resolves to maxina and is rewritten', () => {
    localStorage.setItem('tenant_slug', 'earthlinks');
    expect(readStoredTenantSlug('tenant_slug')).toBe('maxina');
    expect(localStorage.getItem('tenant_slug')).toBe('maxina');
  });

  it('startup migration rewrites every tenant-slug key', () => {
    localStorage.setItem('tenant_slug', 'earthlinks');
    localStorage.setItem('logout_tenant_slug', 'earthlinks');
    migrateStoredTenantSlugs();
    expect(localStorage.getItem('tenant_slug')).toBe('maxina');
    expect(localStorage.getItem('logout_tenant_slug')).toBe('maxina');
  });

  it('a live stored slug is untouched; missing stays null', () => {
    localStorage.setItem('tenant_slug', 'alkalma');
    expect(readStoredTenantSlug('tenant_slug')).toBe('alkalma');
    expect(readStoredTenantSlug('logout_tenant_slug')).toBeNull();
  });

  it('sends a guest with a stored earthlinks slug to the Maxina portal, branded Maxina', () => {
    localStorage.setItem('tenant_slug', 'earthlinks');
    expect(resolveLoginRoute()).toBe('/maxina');
    localStorage.setItem('tenant_slug', 'earthlinks');
    expect(getInstantTenantName('/home')).toBe('Maxina');
  });
});

describe('VTID-04836 — records still tagged earthlinks', () => {
  it('render an event ticket with the Maxina theme', () => {
    expect(resolveTicketTenant('earthlinks')).toBe('maxina');
    expect(resolveTicketTenant('maxina')).toBe('maxina');
    expect(resolveTicketTenant('alkalma')).toBe('alkalma');
    expect(resolveTicketTenant('unknown')).toBe('vitana');
    expect(resolveTicketTenant(undefined)).toBe('vitana');
  });
});
