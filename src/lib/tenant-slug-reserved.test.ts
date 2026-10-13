/**
 * VTID-05151 — reserved tenant slugs and the /:tenantSlug route.
 *
 * The community portal catches every unmatched single-segment URL. A static
 * route always outranks it, so a tenant whose slug equals a top-level route
 * could never be reached. src/generated/reserved-tenant-slugs.json lists every
 * such segment (provision_tenant refuses them, lane B); this suite keeps it
 * fresh and keeps /:tenantSlug the only top-level dynamic route.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { extractSpaRoutes } from '../../scripts/nav/spa-routes.mjs';
import {
  LEGACY_TENANT_ROUTES,
  buildReservedSlugs,
  firstSegment,
} from '../../scripts/nav/build-reserved-tenant-slugs.mjs';
import committed from '@/generated/reserved-tenant-slugs.json';
import { isReservedSlug } from './tenant-registry';

const ROOT = path.resolve(__dirname, '../..');
const APP = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
const ROUTES = extractSpaRoutes(APP) as Array<{ path: string; redirectTo?: string }>;

describe('VTID-05151 — reserved tenant slugs', () => {
  it('the committed file equals a fresh build from App.tsx, screens.json and public/ (run `npm run prebuild` or the builder)', () => {
    expect(committed).toEqual(buildReservedSlugs());
  });

  it('/:tenantSlug is the only top-level single-segment dynamic route', () => {
    const dynamicTopLevel = ROUTES.map((r) => r.path).filter((p) => /^\/:[^/]+$/.test(p));
    expect(
      dynamicTopLevel,
      'A new top-level "/:param" route would collide with the tenant portal (/:tenantSlug). ' +
        'Nest it under a static prefix instead (like /i/:code or /u/:identifier).',
    ).toEqual(['/:tenantSlug']);
  });

  it('every top-level static route except the legacy tenant routes is reserved', () => {
    const missing = ROUTES.map((r) => firstSegment(r.path))
      .filter((s): s is string => !!s && !LEGACY_TENANT_ROUTES.includes(s))
      .filter((s) => !isReservedSlug(s));
    expect([...new Set(missing)]).toEqual([]);
  });

  it('platform prefixes are reserved; the seeded tenant slugs are not', () => {
    for (const s of ['api', 'auth', 'rest', 'storage', 'functions', '_intro', 'e', 'i', 'u', 'assets', 'home', 'commerce', 'discover', 'earthlinks']) {
      expect(isReservedSlug(s), s).toBe(true);
    }
    for (const s of ['maxina', 'alkalma']) expect(isReservedSlug(s), s).toBe(false);
    expect(committed.legacy_tenant_routes).toEqual(['maxina', 'alkalma']);
  });

  it('App.tsx keeps the legacy portals static and mounts the generic portal', () => {
    expect(APP).toContain('<Route path="/maxina" element={<MaxinaPortal />} />');
    expect(APP).toContain('<Route path="/alkalma" element={<TenantPortal slug="alkalma" />} />');
    expect(APP).toContain('<Route path="/:tenantSlug" element={<TenantPortal />} />');
    expect(APP).not.toContain('AlkalmaPortal');
    expect(fs.existsSync(path.join(ROOT, 'src/pages/portals/AlkalmaPortal.tsx'))).toBe(false);
  });
});
