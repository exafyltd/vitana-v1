/**
 * VTID-05178 — the one link resolver (Native app Wave 1, N4-APP Changes 11–12).
 *
 * Every way into a screen goes through `resolveLink`: push taps (`data.url`,
 * falling back to Appilix's `open_link_url`), universal links / App Links and
 * the `maxina://` custom scheme. It accepts
 * - a relative path (`/inbox`),
 * - an `https://` URL on an allowed link host (`vitanaland.com`,
 *   `www.vitanaland.com`, plus the build profile's own link hosts),
 * - a `maxina://` URL,
 * and returns `{ pathname, params, … }`, or null for anything else (foreign
 * host, `http:`, `javascript:`, protocol-relative `//host`). Null opens home;
 * a foreign host is never opened inside the app.
 *
 * Four paths are tagged for N3 instead of being routed:
 * - `/auth/confirmed`, `/reset-password` → `auth` (tokens from the hash or `?code=`)
 * - `/oauth/complete` → `oauth_return` (fallback only; N3 uses native signInWithIdToken)
 * - `/i/:code` → `invite`
 * The redirect URLs are the web's own and unchanged (no Supabase config change).
 *
 * Resolving is pure: no network, no navigation.
 */

export const CUSTOM_SCHEME = 'maxina';

/** The web's own link hosts. Opening them in-app is routing only, never a request. */
export const DEFAULT_LINK_HOSTS: readonly string[] = ['vitanaland.com', 'www.vitanaland.com'];

export type AuthPath = '/auth/confirmed' | '/reset-password';

export interface AuthTokens {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  token_type?: string;
  type?: string;
  token_hash?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
}

const AUTH_TOKEN_KEYS: readonly (keyof AuthTokens)[] = [
  'code',
  'access_token',
  'refresh_token',
  'expires_in',
  'token_type',
  'type',
  'token_hash',
  'error',
  'error_code',
  'error_description',
];

interface Base {
  pathname: string;
  params: Params;
}

export type ResolvedLink =
  | (Base & { kind: 'route' })
  | (Base & { kind: 'auth'; path: AuthPath; tokens: AuthTokens })
  | (Base & { kind: 'oauth_return' })
  | (Base & { kind: 'invite'; code: string });

export interface ResolveOptions {
  /** Extra https hosts for this build profile (app.config.ts `extra.linkHosts`). */
  linkHosts?: readonly string[];
}

const INVITE_PATH = /^\/i\/([A-Za-z0-9_-]{1,128})$/;
/** scheme://authority path ?query #hash — parsed by hand: React Native's URL polyfill is string-based and lenient. */
const ABSOLUTE = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/;
/** A path that starts with exactly one slash (never `//host` or `/\\host`). */
const RELATIVE = /^(\/(?![/\\])[^?#]*)?(\?[^#]*)?(#.*)?$/;

export type Params = Record<string, string>;

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/** `a=1&b=2` (with or without a leading `?` / `#`) → { a: '1', b: '2' }. Later keys win. */
export function parseQuery(query: string): Params {
  const out: Params = {};
  for (const pair of query.replace(/^[?#]/, '').split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const key = decode(i < 0 ? pair : pair.slice(0, i));
    const value = decode(i < 0 ? '' : pair.slice(i + 1));
    if (key && value !== null) out[key] = value;
  }
  return out;
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

interface Located {
  pathname: string;
  query: Params;
  hash: Params;
}

function fromRelative(raw: string): Located | null {
  if (raw.includes('\\')) return null;
  const m = RELATIVE.exec(raw);
  if (!m || !m[1]) return null;
  return { pathname: m[1], query: parseQuery(m[2] ?? ''), hash: parseQuery(m[3] ?? '') };
}

/** Splits the parts we need out of the input, or null when it is not allowed. */
function locate(input: string, hosts: ReadonlySet<string>): Located | null {
  const raw = input.trim();
  // Whitespace or control characters never belong in a link.
  if (!raw || [...raw].some((c) => c.charCodeAt(0) <= 0x20 || c.charCodeAt(0) === 0x7f)) return null;
  if (raw.startsWith('/')) return fromRelative(raw);

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw)?.[1]?.toLowerCase();
  if (scheme === CUSTOM_SCHEME) {
    // maxina://inbox/1 → /inbox/1 ; maxina:///inbox/1 → /inbox/1. What a URL
    // parser would call the "host" is the first path segment here.
    return fromRelative(raw.slice(CUSTOM_SCHEME.length + 1).replace(/^\/*/, '/'));
  }
  if (scheme !== 'https') return null;

  const m = ABSOLUTE.exec(raw);
  if (!m) return null;
  const authority = m[2];
  // No credentials, no port other than 443.
  if (authority.includes('@')) return null;
  const [host, port] = authority.split(':');
  if (port !== undefined && port !== '443') return null;
  if (!hosts.has(normalizeHost(host))) return null;
  return fromRelative(`${m[3] || '/'}${m[4] ?? ''}${m[5] ?? ''}`);
}

function tokensFrom(query: Params, hash: Params): AuthTokens {
  const tokens: AuthTokens = {};
  for (const key of AUTH_TOKEN_KEYS) {
    const value = hash[key] ?? query[key];
    if (value) tokens[key] = value;
  }
  return tokens;
}

export function resolveLink(input: unknown, opts: ResolveOptions = {}): ResolvedLink | null {
  if (typeof input !== 'string' || input.length > 4096) return null;
  const hosts = new Set([...DEFAULT_LINK_HOSTS, ...(opts.linkHosts ?? [])].map(normalizeHost));
  const located = locate(input, hosts);
  if (!located) return null;

  const pathname = located.pathname.length > 1 ? located.pathname.replace(/\/+$/, '') || '/' : '/';
  const params = located.query;

  if (pathname === '/auth/confirmed' || pathname === '/reset-password') {
    // Tokens never travel on as route params.
    return { kind: 'auth', path: pathname, pathname, params: {}, tokens: tokensFrom(located.query, located.hash) };
  }
  if (pathname === '/oauth/complete') {
    return { kind: 'oauth_return', pathname, params };
  }
  const invite = INVITE_PATH.exec(pathname);
  if (invite) {
    return { kind: 'invite', pathname, params, code: invite[1] };
  }
  return { kind: 'route', pathname, params };
}

/**
 * The link a push carries: `data.url` first, then Appilix's `open_link_url`
 * (an Appilix push reaching an updated phone during the transition, F6).
 * Null when neither resolves.
 */
export function resolvePushLink(data: unknown, opts: ResolveOptions = {}): ResolvedLink | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  return resolveLink(d.url, opts) ?? resolveLink(d.open_link_url, opts);
}

/** `pathname?query` for router.push. */
export function hrefOf(link: Pick<ResolvedLink, 'pathname' | 'params'>): string {
  const query = Object.entries(link.params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `${link.pathname}?${query}` : link.pathname;
}
