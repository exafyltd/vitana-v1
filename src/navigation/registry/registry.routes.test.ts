/**
 * VTID-04502 — the registry and App.tsx must agree.
 *
 * 1. Every screen's route (and mobile route) is a real page: it matches a
 *    <Route> that is neither the catch-all NotFound nor a <Navigate>
 *    redirect. The old catalogs pointed at redirects (/cart, /home/matches,
 *    /settings/voice-ai) and at pages that do not exist (/settings/tenant).
 * 2. Every page in App.tsx is either registered or explicitly excluded with
 *    a reason in exclusions.json. Adding a page without deciding fails here —
 *    that is the regression contract for "we added a new screen".
 */
import fs from 'fs';
import path from 'path';
import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { extractSpaRoutes } from '../../../scripts/nav/spa-routes.mjs';
import exclusions from './exclusions.json';
import { SCREENS } from './index';

interface SpaRoute { path: string; redirectTo?: string; index?: boolean; requiredRole?: string }

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
const ROUTES: SpaRoute[] = extractSpaRoutes(APP);
const CATCH_ALL = new Set(['*', '/*']);

/** Turn a registry route into a concrete pathname for matching. */
function concrete(route: string): string {
  return route.split('?')[0].replace(/:([A-Za-z_]+)/g, 'sample-$1');
}

function matchingRoutes(pathname: string): SpaRoute[] {
  return ROUTES.filter((r) => !CATCH_ALL.has(r.path) && matchPath({ path: r.path, end: true }, pathname));
}

function registryRoutes() {
  return SCREENS.flatMap((s) =>
    [['route', s.route], ['mobileRoute', s.mobileRoute]]
      .filter(([, r]) => !!r)
      .map(([field, r]) => ({ id: s.id, field, route: r as string })),
  );
}

describe('VTID-04502 screen registry — routes', () => {
  it('extracts a plausible route inventory from App.tsx', () => {
    expect(ROUTES.length).toBeGreaterThan(300);
    // Nested routes are joined to their parent.
    expect(ROUTES.some((r) => r.path === '/business/sell-earn')).toBe(true);
    expect(ROUTES.find((r) => r.path === '/cart')?.redirectTo).toBe('/universal-cart');
  });

  it('points every screen at a page that exists', () => {
    const missing = registryRoutes()
      .filter(({ route }) => matchingRoutes(concrete(route)).length === 0)
      .map(({ id, field, route }) => `${id}.${field} ${route}`);
    expect(missing).toEqual([]);
  });

  it('never points a screen at a redirect', () => {
    const redirects = registryRoutes()
      .map(({ id, field, route }) => {
        const hits = matchingRoutes(concrete(route));
        const exact = hits.find((h) => !h.path.includes('*')) || hits[0];
        return exact?.redirectTo ? `${id}.${field} ${route} → ${exact.redirectTo}` : null;
      })
      .filter(Boolean);
    expect(redirects).toEqual([]);
  });

  it('registers or explicitly excludes every page in App.tsx', () => {
    const registered = registryRoutes().map(({ route }) => concrete(route));
    const excludedPaths = new Set(exclusions.paths.map((p) => p.path));
    const unaccounted = ROUTES.filter((r) => !r.redirectTo && !r.index && !CATCH_ALL.has(r.path))
      .filter((r) => !exclusions.prefixes.some((p) => r.path === p.prefix || r.path.startsWith(`${p.prefix}/`) || r.path.startsWith(`${p.prefix}-`)))
      .filter((r) => !excludedPaths.has(r.path))
      .filter((r) => !registered.some((pathname) => matchPath({ path: r.path, end: true }, pathname)))
      .map((r) => r.path);
    expect(unaccounted).toEqual([]);
  });

  it('keeps the exclusion list free of stale entries', () => {
    const paths = new Set(ROUTES.map((r) => r.path));
    const stale = exclusions.paths.filter((p) => !paths.has(p.path)).map((p) => p.path);
    expect(stale).toEqual([]);
    expect(exclusions.paths.filter((p) => !p.reason.trim()).map((p) => p.path)).toEqual([]);
  });
});
