/**
 * VTID-05085 — every Unified Card System deep link is a real page: it matches
 * a <Route> in App.tsx that is not a <Navigate> redirect, and the screen
 * registry knows it (so Vitana's navigator can take a member there too).
 */
import fs from 'fs';
import path from 'path';
import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { extractSpaRoutes } from '../../../scripts/nav/spa-routes.mjs';
import { SCREENS } from '@/navigation/registry';
import { CARD_DEEP_LINKS } from './vitana-card-catalog';

interface SpaRoute { path: string; redirectTo?: string }

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
const ROUTES: SpaRoute[] = extractSpaRoutes(APP);
const CATCH_ALL = new Set(['*', '/*']);
const pathnameOf = (link: string) => link.split('#')[0].split('?')[0];

const links = Object.entries(CARD_DEEP_LINKS) as Array<[string, string]>;

describe('Unified Card System deep links (VTID-05085)', () => {
  it('has deep links to check', () => {
    expect(links.length).toBeGreaterThan(5);
  });

  it.each(links)('%s → %s is a real, non-redirect route in App.tsx', (_type, link) => {
    const pathname = pathnameOf(link);
    const hits = ROUTES.filter((r) => !CATCH_ALL.has(r.path) && matchPath({ path: r.path, end: true }, pathname));
    expect(hits.length, `${link} has no route`).toBeGreaterThan(0);
    const exact = hits.find((h) => !h.path.includes('*')) || hits[0];
    expect(exact.redirectTo, `${link} is a redirect to ${exact.redirectTo}`).toBeUndefined();
  });

  it.each(links)('%s → %s is in the screen registry', (_type, link) => {
    const pathname = pathnameOf(link);
    expect(SCREENS.some((s) => s.route.split('?')[0] === pathname || s.mobileRoute?.split('?')[0] === pathname), pathname).toBe(true);
  });

  it('never links to the routes the plan corrected away', () => {
    const all = Object.values(CARD_DEEP_LINKS).map(pathnameOf);
    for (const bad of ['/me/edit', '/comm/create-post', '/settings/connected-apps']) expect(all).not.toContain(bad);
  });
});
