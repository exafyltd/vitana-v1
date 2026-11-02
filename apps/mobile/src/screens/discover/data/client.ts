/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the gateway doors
 * every Discover read / write goes through, re-implemented natively (the web
 * modules are class B: they import the Supabase client, `import.meta.env` or
 * the community gateway, so they are not core-extracted). `getGateway()`
 * (N1's `createGatewayFetch`) adds the member's Bearer token and the `/api/v1`
 * prefix; each door adds what its web twin adds on top:
 *
 *  - `discoverJson` — `src/hooks/useMarketplace.ts` `authHeaders()`:
 *    `Content-Type: application/json` and the token when signed in (guests
 *    read the public storefront);
 *  - `shopJson` — `src/lib/shop-feed-client.ts` `shopFeedFetch` over
 *    `communityFetch` (`src/lib/community-gateway.ts:7-25`): signed-out throws
 *    "Not authenticated", `X-Vitana-Active-Role: community`, JSON content type
 *    for a body, `{ ok:false }` / non-2xx → `ShopFeedApiError`;
 *  - `cartJson` — `src/lib/universal-cart-client.ts` `universalCartFetch`:
 *    no token → `UniversalCartApiError(401, 'unauthenticated')` without a
 *    request, the active-role header, 403 `cart_unavailable_for_role` →
 *    `UniversalCartRoleError`;
 *  - `chatJson` — `src/hooks/useChatApi.ts` `gatewayFetch` / `gatewayGroupFetch`
 *    (`/chat…`, `/chat/groups…`): non-2xx throws the body's `error`.
 */
import { getGateway } from '../../../auth/gateway';
import { getAccessToken } from '../../../auth/client';
import { config, endpoints } from '../../../ports/env';

export const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';

/**
 * The web origin share links are built on (web: src/lib/shareUrl.ts product
 * links on the public site, `/shop?v=` on the page origin). Natively that is
 * the profile's `webBaseUrl` (EXPO_PUBLIC_WEB_BASE_URL, checked by
 * assertNotProduction); with none configured the link is the bare path.
 */
export function publicWebOrigin(): string {
  return (config.webBaseUrl ?? '').replace(/\/+$/, '');
}

async function readJson(res: Response): Promise<{ text: string; body: unknown }> {
  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }
  return { text, body };
}

/** The gateway's bare origin (web `GATEWAY_URL` without `/api/v1`), or '' when the build has none. */
export function gatewayOrigin(): string {
  try {
    return endpoints(config).gatewayOrigin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

// ── discover (marketplace) ──────────────────────────────────────────────
export async function discoverJson<T>(path: string, init: RequestInit = {}): Promise<{ status: number; ok: boolean; body: T }> {
  const res = await getGateway()(path, { ...init, headers: { 'Content-Type': 'application/json', ...((init.headers as Record<string, string> | undefined) ?? {}) } });
  const { body } = await readJson(res);
  return { status: res.status, ok: res.ok, body: (body ?? {}) as T };
}

// ── shop feed (community gateway) ───────────────────────────────────────
export class ShopFeedApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = 'ShopFeedApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/** `communityFetch` + `shopFeedFetch`. */
export async function shopJson<T>(path: string, opts: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  const res = await getGateway()(path, { method: opts.method ?? 'GET', body, headers });
  const { text, body: parsed } = await readJson(res);
  const asObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!res.ok || asObj?.ok === false) {
    const code = asObj && typeof asObj.error === 'string' ? asObj.error : `http_${res.status}`;
    const detail = asObj && 'detail' in asObj ? asObj.detail : asObj;
    throw new ShopFeedApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

// ── universal cart ──────────────────────────────────────────────────────
export class UniversalCartRoleError extends Error {
  readonly role: string | null;
  constructor(role: string | null) {
    super('cart_unavailable_for_role');
    this.name = 'UniversalCartRoleError';
    this.role = role;
  }
}

export class UniversalCartApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = 'UniversalCartApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/** `universalCartFetch`. */
export async function cartJson<T>(path: string, opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new UniversalCartApiError(401, 'unauthenticated', null, 'Not authenticated');
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await getGateway()(path, { method: opts.method ?? 'GET', headers, body });
  const { text, body: parsed } = await readJson(res);
  const asObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!res.ok) {
    if (res.status === 403 && asObj?.error === 'cart_unavailable_for_role') {
      throw new UniversalCartRoleError((asObj?.role as string | null) ?? null);
    }
    const code = asObj && typeof asObj.error === 'string' ? asObj.error : `http_${res.status}`;
    const detail = asObj && 'detail' in asObj ? asObj.detail : asObj;
    throw new UniversalCartApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

// ── chat (send in message) ──────────────────────────────────────────────
export async function chatJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await getGateway()(`/chat${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...((init.headers as Record<string, string> | undefined) ?? {}) } });
  const { body } = await readJson(res);
  if (!res.ok) {
    const b = (body ?? {}) as { error?: unknown };
    throw new Error(typeof b.error === 'string' ? b.error : `Gateway ${res.status}`);
  }
  return (body ?? {}) as T;
}
