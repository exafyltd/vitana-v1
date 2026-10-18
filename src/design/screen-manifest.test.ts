/**
 * VTID-05107 — every screen route has exactly one Spotlight archetype
 * (docs/design-system/SPOTLIGHT_RULES.md §A). Adding a page to App.tsx without
 * a manifest entry fails here: run `node scripts/design/screen-manifest.mjs --sync`,
 * then review the guessed archetype.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '@/components/layout/spotlight/archetypes';
import { REDIRECT_COMPONENTS, redirectComponentPaths, screenRoutes } from '../../scripts/design/screen-manifest.mjs';
import manifest from './screen-manifest.json';

interface Entry { path: string; archetype: string; tier: string; area: string; status: string; phase: string }

const APP = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const routes: { path: string; tier: string }[] = screenRoutes(APP);
const entries = manifest.screens as Entry[];

describe('VTID-05107 Spotlight screen manifest', () => {
  it('lists every screen route in App.tsx exactly once', () => {
    const listed = new Set(entries.map((e) => e.path));
    const missing = routes.map((r) => r.path).filter((p) => !listed.has(p));
    expect(missing, 'routes without a manifest entry — run node scripts/design/screen-manifest.mjs --sync').toEqual([]);
    expect(entries.length).toBe(new Set(entries.map((e) => e.path)).size);
  });

  it('has no stale entries for routes that no longer exist', () => {
    const live = new Set(routes.map((r) => r.path));
    expect(entries.filter((e) => !live.has(e.path)).map((e) => e.path)).toEqual([]);
  });

  it('gives every screen a known archetype, a tier and a status', () => {
    const bad = entries.filter(
      (e) => !(ARCHETYPES as readonly string[]).includes(e.archetype) || !['A', 'B', 'C', 'P'].includes(e.tier) || !['legacy', 'migrated'].includes(e.status),
    );
    expect(bad).toEqual([]);
  });

  it('tiers match the route classification', () => {
    const tierOf = new Map(routes.map((r) => [r.path, r.tier]));
    expect(entries.filter((e) => tierOf.get(e.path) !== e.tier).map((e) => e.path)).toEqual([]);
  });

  it('operator routes are workspace screens', () => {
    expect(entries.filter((e) => e.tier === 'C' && e.archetype !== 'workspace').map((e) => e.path)).toEqual([]);
  });
});

// Pure redirect components are not screens: like a <Navigate> route, a route
// whose whole element is one of them has no manifest entry.
describe('redirect components leave the manifest', () => {
  const wrap = (routesJsx: string) => `<Routes>\n${routesJsx}\n<Route path="/kept" element={<KeptPage />} />\n</Routes>`;
  const cases: [string, string][] = [
    ['RedirectPreservingSearch', '<Route path="/old-a" element={<RedirectPreservingSearch to="/connectors" />} />'],
    ['LegacyProfileRedirect', '<Route path="/old-b/:id" element={<LegacyProfileRedirect />} />'],
    ['RetiredTenantRedirect', '<Route path="/old-c/*" element={<RetiredTenantRedirect />} />'],
    ['CommerceConnectionRedirect', '<Route path="/old-d/:id" element={<AuthGuard><CommerceConnectionRedirect /></AuthGuard>} />'],
    ['InviteLanding', '<Route path="/old-e/:code" element={<InviteLanding />} />'],
  ];

  it('covers exactly the five known redirect components', () => {
    expect([...REDIRECT_COMPONENTS].sort()).toEqual(cases.map(([c]) => c).sort());
  });

  for (const [component, route] of cases) {
    it(`${component}: its route is excluded, a real screen next to it is kept`, () => {
      const src = wrap(route);
      const redirectPath = /path="([^"]+)"/.exec(route)![1];
      expect(redirectComponentPaths(src).has(redirectPath)).toBe(true);
      const paths = screenRoutes(src).map((r) => r.path);
      expect(paths).not.toContain(redirectPath);
      expect(paths).toContain('/kept');
    });
  }

  it('the App.tsx routes of the redirect components have no manifest entry', () => {
    const redirects = redirectComponentPaths(APP);
    expect(redirects.size).toBeGreaterThanOrEqual(5);
    const listed = new Set(entries.map((e) => e.path));
    expect([...redirects].filter((p) => listed.has(p))).toEqual([]);
  });

  it('a component that only shares a redirect name prefix is still a screen', () => {
    const src = wrap('<Route path="/real" element={<InviteLandingPage />} />');
    expect(screenRoutes(src).map((r) => r.path)).toContain('/real');
  });
});
