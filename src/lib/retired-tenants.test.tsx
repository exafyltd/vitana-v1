/**
 * VTID-04836 — the earthlinks tenant is retired (merged into maxina by
 * platform migration 20260427120000_vtid_01985_earthlinks_to_maxina_cleanup).
 *
 *  1. TenantType no longer includes earthlinks.
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
import type { TenantType } from '@/hooks/useTenant';
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

describe('VTID-04836 — TenantType', () => {
  it('no longer includes earthlinks', () => {
    // Compile-time: tsc fails if 'earthlinks' becomes assignable again.
    // @ts-expect-error — earthlinks is not a TenantType
    const retired: TenantType = 'earthlinks';
    const live: TenantType[] = ['maxina', 'alkalma'];
    expect(live).not.toContain(retired);

    // Source-level: the union and the config map carry no earthlinks entry.
    const useTenant = read('hooks/useTenant.tsx');
    const union = /export type TenantType = ([^;]+);/.exec(useTenant)?.[1] ?? '';
    expect(union).toBe('"maxina" | "alkalma"');
    expect(useTenant).not.toMatch(/^\s*earthlinks:\s*\{/m);
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
