/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the native twin of the
 * web's `adminFetch` (src/lib/admin-api.ts), `gatewayCall`
 * (src/lib/catalogue-import.ts) and `fetchMcpReady` (src/lib/commerce-mcp.ts).
 *
 * The web paths are kept verbatim (`/api/v1/partner-orgs/mine`, …, the
 * constants come from `@vitana/core` through src/ports/commerce.ts): the
 * native gateway fetch already prepends `/api/v1` (`gatewayApiUrl`), so the
 * prefix is stripped here once. Same headers as the web (`Content-Type`, the
 * bearer token from the session, `X-Vitana-Tenant` from the session's
 * `app_metadata.active_tenant_id`), same error rule (`body.error ||
 * body.message || HTTP <status>` as the Error message, which the screens match
 * on exactly like the web), same `NO_AUTH_TOKEN` without a session.
 *
 * Nothing here is ever pointed at a live backend in tests: the gateway and
 * Supabase are doubles installed through the shell's test hooks (R5.2).
 */
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { config, endpoints } from '../../../ports/env';

export type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the web's adminFetch is untyped too; callers type the payload

/** `/api/v1/x` → `/x` (the native gateway adds the prefix itself). */
export function gatewayRel(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p.replace(/^\/api\/v1(?=\/|$)/, '') || '/';
}

async function sessionHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error('NO_AUTH_TOKEN');
  const meta = session.user?.app_metadata as Record<string, unknown> | undefined;
  const tenant = typeof meta?.active_tenant_id === 'string' && meta.active_tenant_id.trim() ? meta.active_tenant_id : null;
  return { 'Content-Type': 'application/json', ...(tenant ? { 'X-Vitana-Tenant': tenant } : {}) };
}

function headersOf(init: RequestInit): Record<string, string> {
  const out: Record<string, string> = {};
  new Headers(init.headers ?? undefined).forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function parse(res: Response): Promise<{ status: number; ok: boolean; body: Json }> {
  const text = await res.text().catch(() => '');
  let body: Json = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }
  return { status: res.status, ok: res.ok, body };
}

/** `adminFetch(path, init)`: JSON in, JSON out; a non-2xx throws `Error(body.error || body.message || 'HTTP <status>')`. */
export async function commerceFetch(path: string, init: RequestInit = {}): Promise<Json> {
  const headers = { ...(await sessionHeaders()), ...headersOf(init) };
  const res = await getGateway()(gatewayRel(path), { ...init, headers });
  const { ok, status, body } = await parse(res);
  if (!ok) {
    const msg = body?.error || body?.message || `HTTP ${status}`;
    throw new Error(String(msg));
  }
  return body;
}

/** `gatewayCall` (catalogue-import.ts): keeps the status and body of a 4xx (the import's report lives there). */
export async function commerceCall(path: string, init: RequestInit): Promise<{ status: number; body: Json }> {
  const headers = { ...(await sessionHeaders()), ...headersOf(init) };
  const res = await getGateway()(gatewayRel(path), { ...init, headers });
  const { status, body } = await parse(res);
  return { status, body };
}

/** The gateway origin this build talks to (web `GATEWAY_BASE`), or '' when the build has none configured. */
export function gatewayBase(): string {
  try {
    return endpoints(config).gatewayOrigin.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  } catch {
    return '';
  }
}

/** `COMMERCE_MCP_URL` — the address a supplier pastes into their AI assistant. */
export function commerceMcpUrl(): string {
  const base = gatewayBase();
  return base ? `${base}/mcp` : '';
}

/** `COMMERCE_MCP_METADATA_URL` — the public OAuth protected-resource metadata. */
export function commerceMcpMetadataUrl(): string {
  const base = gatewayBase();
  return base ? `${base}/.well-known/oauth-protected-resource/mcp` : '';
}

type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** `fetchMcpReady`: true when the gateway serves the MCP endpoint with a sign-in server. Any error → false. */
export async function fetchMcpReady(fetchFn: FetchLike = (u, i) => fetch(u, i)): Promise<boolean> {
  const url = commerceMcpMetadataUrl();
  if (!url) return false;
  try {
    const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { resource?: unknown; authorization_servers?: unknown };
    return typeof body.resource === 'string' && body.resource.endsWith('/mcp') && Array.isArray(body.authorization_servers) && body.authorization_servers.length > 0;
  } catch {
    return false;
  }
}

/** The web origin invite links point at (web `window.location.origin`), or '' when the build has none. */
export function webOrigin(): string {
  const base = config.webBaseUrl || config.authRedirectUrl || '';
  return base.replace(/\/+$/, '');
}
