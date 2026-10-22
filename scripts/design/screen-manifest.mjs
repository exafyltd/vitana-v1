#!/usr/bin/env node
/**
 * VTID-05107 — Spotlight screen manifest (docs/design-system/SPOTLIGHT_RULES.md §A).
 *
 * src/design/screen-manifest.json lists EVERY screen route in src/App.tsx
 * (redirects and the catch-all excluded) with exactly one archetype, its tier,
 * its migration status (legacy | migrated) and the Spotlight phase that owns
 * it. src/design/screen-manifest.test.ts fails when a route is missing, stale
 * or invalid, so a new screen cannot ship without choosing an archetype.
 *
 *   node scripts/design/screen-manifest.mjs --sync
 *
 * adds missing routes (archetype guessed from the path — review the guess!)
 * and drops routes that no longer exist. Existing entries are never changed:
 * archetype and status are hand-owned data once a route is in the manifest.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildInventory } from './desktop-screen-inventory.mjs';

export const MANIFEST = 'src/design/screen-manifest.json';

/**
 * Components that only redirect (they render a <Navigate> or call navigate()
 * on mount and show no screen of their own). A route whose whole element is
 * one of these — optionally inside <AuthGuard> — is treated like a
 * <Navigate> route: it is not a screen and has no manifest entry.
 */
export const REDIRECT_COMPONENTS = new Set([
  'RedirectPreservingSearch',
  'LegacyProfileRedirect',
  'RetiredTenantRedirect',
  'CommerceConnectionRedirect',
  'InviteLanding',
]);

const REDIRECT_ROUTE_RX =
  /<Route\s+path="([^"]+)"\s+element=\{\s*(?:<AuthGuard>\s*)?<([A-Z][A-Za-z0-9]*)\b[^>]*?\/>\s*(?:<\/AuthGuard>\s*)?\}\s*\/>/g;

/** Paths of the routes in App.tsx whose whole element is a redirect component. */
export function redirectComponentPaths(appSource) {
  const out = new Set();
  for (const m of appSource.matchAll(REDIRECT_ROUTE_RX)) {
    if (REDIRECT_COMPONENTS.has(m[2])) out.add(m[1]);
  }
  return out;
}

/** The screen routes the manifest lists: the inventory minus redirect-component routes. */
export function screenRoutes(appSource) {
  const redirects = redirectComponentPaths(appSource);
  return buildInventory(appSource).screens.filter((s) => !redirects.has(s.path));
}

const PHASE_BY_TIER = { A: '2-4', B: '5', C: '7', P: '7' };

/** First-guess archetype for a NEW route. Humans own the value afterwards. */
export function guessArchetype(path, tier) {
  if (tier === 'C') return 'workspace';
  if (/^\/(home|news)$/.test(path) || /^\/comm\/(media-hub|live-rooms)(\/|$)/.test(path)) return 'focus-feed';
  if (/^\/shop$/.test(path)) return 'immersive';
  if (/^\/(discover|business)$/.test(path) || /^\/discover\/deals-offers$/.test(path)) return 'storefront';
  if (/^\/(inbox|messages|assistant|ai)(\/|$)/.test(path)) return 'conversation';
  if (/^\/(health|wallet|autopilot)$/.test(path) || /vitana-index/.test(path)) return 'dashboard';
  if (/^\/(settings|auth|reset-password|onboarding|apply|invite|redeem|privacy|terms|delete-account|logout|oauth)(\/|$)/.test(path)
    || /\/(edit|create|new|compose)(\/|$)/.test(path) || /^\/(maxina|alkalma|_intro|commerce-login|i)(\/|$)/.test(path) || path === '/') return 'form';
  if (/:[A-Za-z_]+/.test(path) || /^\/(post|u|e)\//.test(path)) return 'detail';
  return 'collection';
}

export function syncManifest(current, appSource) {
  const screens = screenRoutes(appSource);
  const byPath = new Map((current?.screens ?? []).map((s) => [s.path, s]));
  const out = screens.map(({ path, tier, area }) => {
    const prev = byPath.get(path);
    if (prev) return { ...prev, tier, area };
    return { path, archetype: guessArchetype(path, tier), tier, area, status: 'legacy', phase: PHASE_BY_TIER[tier] };
  });
  out.sort((a, b) => a.path.localeCompare(b.path));
  return {
    _comment: 'VTID-05107 Spotlight screen manifest. One archetype per screen route. Edit archetype/status by hand; run node scripts/design/screen-manifest.mjs --sync after adding or removing routes.',
    screens: out,
  };
}

// pathToFileURL so the CLI guard also matches on Windows (C:\… → file:///C:/…).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const current = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
  const next = syncManifest(current, readFileSync('src/App.tsx', 'utf8'));
  writeFileSync(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
  const counts = next.screens.reduce((m, s) => ((m[s.archetype] = (m[s.archetype] ?? 0) + 1), m), {});
  console.log(`wrote ${MANIFEST}: ${next.screens.length} screens`, counts);
}
