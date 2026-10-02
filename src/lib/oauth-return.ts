/**
 * VTID-04832 — where a Commerce OAuth sign-in comes back to.
 *
 * Two bugs this closes:
 *   1. The return URL was built with `getEmailRedirectUrl()`, which always
 *      names https://vitanaland.com. A sign-in started on staging therefore
 *      came back to production. A sign-in now returns to the host it started
 *      on, when that host is a known Vitana host (anything else keeps the
 *      production default, exactly as before).
 *   2. When the provider round-trip fails — most often "OAuth state has
 *      expired" after a long Google security check — Supabase sends the
 *      browser to its Site URL with `error`/`error_code` in the query or hash,
 *      and the app root forwarded that to the MAXINA intro. A sign-in started
 *      from Commerce leaves a short-lived marker; any route that comes back
 *      with an OAuth error while that marker is fresh (or any /commerce route
 *      with an OAuth error) goes to /commerce/join with a retry message.
 *
 * The marker is localStorage and therefore per host: it can only help when
 * Supabase returns the browser to the host the sign-in started on.
 */

import { PUBLIC_BASE_URL } from '@/utils/redirectUrls';

/** Hosts an OAuth sign-in may return to. Each must also be in Supabase Auth's Redirect URLs. */
export const OAUTH_RETURN_HOSTS = ['vitanaland.com', 'www.vitanaland.com', 'preview-aws.vitanaland.com'] as const;

const PENDING_KEY = 'vitana.oauth.pending';
const PENDING_TTL_MS = 30 * 60 * 1000;

export type OAuthErrorKind = 'expired' | 'cancelled' | 'failed';

/** Absolute return URL for `path` on the current host when trusted, else on production. */
export function oauthReturnUrl(path: string, origin: string = window.location.origin): string {
  let base = PUBLIC_BASE_URL;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && (OAUTH_RETURN_HOSTS as readonly string[]).includes(u.hostname)) base = u.origin;
  } catch {
    // keep the production default
  }
  return new URL(path, base).toString();
}

/** Records that a Commerce OAuth round-trip has started on this host. */
export function rememberCommerceOAuth(now: number = Date.now()): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ portal: 'commerce', at: now }));
  } catch {
    // storage unavailable: the /commerce path rule below still applies
  }
}

/** Reads and clears the marker; true when a Commerce sign-in started within the last 30 minutes. */
export function takeCommerceOAuth(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    if (!raw) return false;
    const m = JSON.parse(raw) as { portal?: string; at?: number };
    return m.portal === 'commerce' && typeof m.at === 'number' && now - m.at >= 0 && now - m.at < PENDING_TTL_MS;
  } catch {
    return false;
  }
}

/** The OAuth error a provider/Supabase redirect carried in the query or hash, if any. */
export function oauthErrorFrom(search: string, hash: string): OAuthErrorKind | null {
  const params = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const error = params.get('error') ?? h.get('error');
  const code = params.get('error_code') ?? h.get('error_code');
  const description = params.get('error_description') ?? h.get('error_description') ?? '';
  if (!error && !code) return null;
  if (code === 'bad_oauth_state' || /expired/i.test(description)) return 'expired';
  if (error === 'access_denied') return 'cancelled';
  return 'failed';
}

/**
 * Where to send the browser after an OAuth error, or null to leave it alone.
 * Only Commerce sign-ins are redirected; every other portal keeps its own
 * behaviour.
 */
export function commerceOAuthErrorTarget(pathname: string, search: string, hash: string, fromCommerce: boolean): string | null {
  const kind = oauthErrorFrom(search, hash);
  if (!kind) return null;
  if (!fromCommerce && !pathname.startsWith('/commerce')) return null;
  return `/commerce/join?oauth_error=${kind}`;
}

/**
 * Runs once at boot, before the router renders: rewrites an OAuth-error
 * landing from a Commerce sign-in to the Commerce join screen. Done on the URL
 * itself so no route (the root's redirect to the MAXINA intro included) ever
 * sees the error first.
 */
export function applyCommerceOAuthReturn(basename: string = import.meta.env.BASE_URL ?? '/'): void {
  const { pathname, search, hash } = window.location;
  if (!oauthErrorFrom(search, hash)) {
    // A successful return ends the round-trip, so a stale marker cannot
    // redirect some later, unrelated error.
    if (/[?&]code=/.test(search) || /access_token=/.test(hash)) takeCommerceOAuth();
    return;
  }
  const base = basename.replace(/\/$/, '');
  const routePath = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
  const target = commerceOAuthErrorTarget(routePath, search, hash, takeCommerceOAuth());
  if (target) window.history.replaceState(null, '', `${base}${target}`);
}
