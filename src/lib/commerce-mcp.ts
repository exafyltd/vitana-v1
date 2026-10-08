/**
 * VTID-04848 — "Connect your AI agent": the one-step Commerce onboarding.
 *
 * The supplier copies the Vitanaland MCP address into their AI assistant
 * (Claude, ChatGPT, …), signs in with their Vitanaland account, and tells it
 * which business to onboard. The address is the gateway this build talks to
 * (gateway VTID-04847 serves POST /mcp), so staging builds hand out the
 * staging address and production builds the production one.
 *
 * The portal leads with this path only when the gateway actually answers its
 * OAuth protected-resource metadata — a public, unauthenticated GET that is
 * 404 while COMMERCE_MCP_ENABLED is off. Until then the portal keeps its
 * current layout: never a button that leads nowhere.
 */
import { GATEWAY_BASE } from '@/lib/gateway-base';
import { supabase } from '@/integrations/supabase/client';

export const COMMERCE_MCP_URL = `${GATEWAY_BASE}/mcp`;
export const COMMERCE_MCP_METADATA_URL = `${GATEWAY_BASE}/.well-known/oauth-protected-resource/mcp`;

export const SUPPORTED_ASSISTANTS = ['Claude', 'ChatGPT', 'Gemini'] as const;

/** The tools the gateway serves (COMMERCE_MCP_TOOLS, gateway VTID-04847) — shown under Advanced. */
export const COMMERCE_MCP_TOOL_NAMES = [
  'get_onboarding_status',
  'create_business',
  'update_business',
  'add_product',
  'list_products',
  'update_product',
  'check_verification',
  'connect_store',
  'submit_for_verification',
] as const;

/** Where Supabase Auth's OAuth server sends the supplier to approve an assistant. */
export const CONNECT_AUTHORIZE_PATH = '/commerce/connect/authorize';

type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** True when the gateway serves the MCP endpoint with a sign-in server. Any error → false. */
export async function fetchMcpReady(fetchFn: FetchLike = (u, i) => fetch(u, i)): Promise<boolean> {
  try {
    const res = await fetchFn(COMMERCE_MCP_METADATA_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { resource?: unknown; authorization_servers?: unknown };
    return (
      typeof body.resource === 'string' &&
      body.resource.endsWith('/mcp') &&
      Array.isArray(body.authorization_servers) &&
      body.authorization_servers.length > 0
    );
  } catch {
    return false;
  }
}

// ==================== Consent (Supabase Auth OAuth 2.1 server) ====================

/** What the consent screen shows about the assistant asking to connect. */
export interface ConsentDetails {
  authorizationId: string;
  clientName: string;
  clientUri: string | null;
  redirectUri: string | null;
  scopes: string[];
}

export type ConsentLookup =
  | { kind: 'consent'; details: ConsentDetails }
  /** Already approved before: go straight back to the assistant. */
  | { kind: 'redirect'; url: string }
  | { kind: 'error'; message: string };

/** Pick the client-facing fields out of Supabase's authorization details. */
export function parseConsentDetails(authorizationId: string, data: unknown): ConsentLookup {
  const d = (data ?? {}) as Record<string, any>;
  if (typeof d.redirect_url === 'string' && !d.authorization_id && !d.client) return { kind: 'redirect', url: d.redirect_url };
  const client = (d.client ?? {}) as Record<string, any>;
  const name = String(client.client_name ?? client.name ?? '').trim();
  const scopeRaw = d.scope ?? d.scopes ?? '';
  const scopes = Array.isArray(scopeRaw) ? scopeRaw.map(String) : String(scopeRaw).split(/\s+/).filter(Boolean);
  return {
    kind: 'consent',
    details: {
      authorizationId: String(d.authorization_id ?? authorizationId),
      clientName: name,
      clientUri: typeof client.client_uri === 'string' ? client.client_uri : null,
      redirectUri: typeof d.redirect_uri === 'string' ? d.redirect_uri : null,
      scopes,
    },
  };
}

/** Where to send the user after approve / deny. */
export function parseConsentDecision(data: unknown): string | null {
  const d = (data ?? {}) as Record<string, any>;
  const url = d.redirect_url ?? d.redirect_to ?? d.url;
  return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
}

interface OAuthApi {
  getAuthorizationDetails?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  approveAuthorization?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  denyAuthorization?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

const SUPABASE_AUTH_URL = `${(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co'
).replace(/\/+$/, '')}/auth/v1`;
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';

/**
 * supabase-js gained `auth.oauth` for the OAuth 2.1 server after the version
 * pinned here (auth-js 2.71); use it when present, else the same Supabase
 * Auth endpoints it wraps, with the user's own session.
 */
function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api && typeof api.getAuthorizationDetails === 'function' ? api : null;
}

async function authRest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_signed_in');
  const res = await fetch(`${SUPABASE_AUTH_URL}${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((body as any)?.msg ?? (body as any)?.error_description ?? (body as any)?.error ?? res.status));
  return body;
}

export async function lookupConsent(authorizationId: string): Promise<ConsentLookup> {
  try {
    const api = oauthApi();
    if (api?.getAuthorizationDetails) {
      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (error) return { kind: 'error', message: error.message ?? 'error' };
      return parseConsentDetails(authorizationId, data);
    }
    return parseConsentDetails(authorizationId, await authRest(`/oauth/authorizations/${encodeURIComponent(authorizationId)}`));
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'error' };
  }
}

export async function decideConsent(authorizationId: string, approve: boolean): Promise<string | null> {
  const api = oauthApi();
  if (api?.approveAuthorization && api.denyAuthorization) {
    const { data, error } = approve ? await api.approveAuthorization(authorizationId) : await api.denyAuthorization(authorizationId);
    if (error) throw new Error(error.message ?? 'error');
    return parseConsentDecision(data);
  }
  return parseConsentDecision(
    await authRest(`/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`, {
      method: 'POST',
      body: JSON.stringify({ action: approve ? 'approve' : 'deny' }),
    }),
  );
}
