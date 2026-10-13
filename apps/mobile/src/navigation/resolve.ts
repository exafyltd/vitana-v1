/**
 * VTID-05186 (N3, plan changes 14 + 19 / I-SH.2) — web path → native destination.
 *
 * The destinations are the web destinations already listed in
 * apps/mobile/parity/ledger.json (every screens.json route/mobileRoute,
 * exclusions path and App.tsx role route — the expected set that
 * `parity-ledger.mjs --check` keeps current), plus the registry's
 * `route → mobileRoute` aliases (a web route that the phone shows elsewhere,
 * e.g. /settings/billing → /settings?mode=billing). No second manifest and no
 * generator.
 *
 *   native            a concrete route file exists in app/ (Expo Router ranks it
 *                     above the catch-all)
 *   unported          a known destination not yet native: the resolver route
 *                     renders Unported inside the shell
 *   external-console  scope out:system-browser (admin): opened in the system
 *                     browser (program decision 3)
 *   not-found         unknown path
 */
import ledger from '../../parity/ledger.json';
import { SCREENS } from '../ports/core';

export type ResolutionKind = 'native' | 'unported' | 'not-found' | 'external-console';

export type Resolution = {
  kind: ResolutionKind;
  /** Path + query to navigate to (query preserved). */
  href: string;
  path: string;
  query: string;
  /** The ledger row key (screens.json id, exclusion path or role route). */
  key?: string;
};

type Row = { key: string; web_path: string; scope: string; source: string };

/**
 * Concrete native route files (app/**, groups stripped). tests/navigation.test.ts
 * keeps this list equal to the files on disk.
 */
export const NATIVE_ROUTES: readonly string[] = ['/', '/alkalma', '/dev/orb-bench', '/logout', '/maxina', '/oauth/complete', '/reset-password'];

const ROWS: readonly Row[] = (ledger.rows as Row[]).filter((r) => r.scope !== 'pending');

function split(url: string): { path: string; query: string } {
  const noHash = url.split('#')[0];
  const i = noHash.indexOf('?');
  const rawPath = i >= 0 ? noHash.slice(0, i) : noHash;
  const query = i >= 0 ? noHash.slice(i + 1) : '';
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  return { path: path || '/', query };
}

/** `/inbox/u/:id` matches one segment per param; a trailing `/*` matches the prefix and everything under it. */
export function matchPattern(pattern: string, path: string): boolean {
  const p = split(pattern).path;
  if (p.endsWith('/*')) {
    const prefix = p.slice(0, -2);
    return path === prefix || path.startsWith(`${prefix}/`) || matchPattern(prefix, path);
  }
  const ps = p.split('/');
  const xs = path.split('/');
  if (ps.length !== xs.length) return false;
  return ps.every((seg, i) => (seg.startsWith(':') ? xs[i].length > 0 : seg === xs[i]));
}

function queryMatches(patternQuery: string, query: string): boolean {
  if (!patternQuery) return true;
  const want = new URLSearchParams(patternQuery);
  const got = new URLSearchParams(query);
  for (const [k, v] of want) if (got.get(k) !== v) return false;
  return true;
}

/** registry route → mobileRoute, for screens the phone shows under another path. */
const ALIASES = SCREENS.filter((s) => s.mobileRoute && s.mobileRoute !== s.route).map((s) => ({ route: s.route, mobileRoute: s.mobileRoute as string }));

function href(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

export function resolveWebPath(url: string, depth = 0): Resolution {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return { kind: 'not-found', href: url, path: url, query: '' };
  const { path, query } = split(url.startsWith('/') ? url : `/${url}`);

  if (NATIVE_ROUTES.includes(path)) return { kind: 'native', href: href(path, query), path, query };

  // A web route the phone shows elsewhere: follow the alias (most specific query first).
  const alias = ALIASES.filter((a) => matchPattern(a.route, path) && queryMatches(split(a.route).query, query)).sort(
    (a, b) => split(b.route).query.length - split(a.route).query.length,
  )[0];
  if (alias && depth < 3) {
    const target = split(alias.mobileRoute);
    const extra = new URLSearchParams(query);
    for (const k of new URLSearchParams(split(alias.route).query).keys()) extra.delete(k);
    const merged = [target.query, extra.toString()].filter(Boolean).join('&');
    return resolveWebPath(href(target.path, merged), depth + 1);
  }

  const candidates = ROWS.filter((r) => matchPattern(r.web_path, path));
  if (candidates.length === 0) return { kind: 'not-found', href: href(path, query), path, query };
  const best =
    candidates.find((r) => split(r.web_path).query && queryMatches(split(r.web_path).query, query)) ??
    candidates.find((r) => !split(r.web_path).query && !r.web_path.endsWith('/*')) ??
    candidates.find((r) => !split(r.web_path).query) ??
    candidates[0];
  const kind: ResolutionKind = best.scope === 'out:system-browser' ? 'external-console' : 'unported';
  return { kind, href: href(path, query), path, query, key: best.key };
}
