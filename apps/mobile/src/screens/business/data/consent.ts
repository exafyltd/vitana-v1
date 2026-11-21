/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the AI-assistant consent
 * calls of `/commerce/connect/authorize`, natively: Supabase Auth's OAuth 2.1
 * server (`lookupConsent` / `decideConsent`, src/lib/commerce-mcp.ts) and the
 * two `ai_connection_*` RPCs (src/lib/ai-connections.ts). The response parsing
 * is the web's own (`parseConsentDetails`, `parseConsentDecision`,
 * `parseAuthorizationInfo` from `@vitana/core`).
 *
 * Same fallback as the web: supabase-js `auth.oauth` when the pinned version
 * has it, else the same Supabase Auth endpoints it wraps, with the member's
 * own session (project URL + publishable key from the build's config — never
 * a hardcoded host).
 */
import { getSupabase } from '../../../auth/client';
import { config, endpoints } from '../../../ports/env';
import {
  parseAuthorizationInfo,
  parseConsentDecision,
  parseConsentDetails,
  type AuthorizationInfo,
  type ConsentLookup,
  type GrantCategory,
} from '../../../ports/commerce';

interface OAuthApi {
  getAuthorizationDetails?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  approveAuthorization?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
  denyAuthorization?: (id: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function oauthApi(): OAuthApi | null {
  const api = (getSupabase().auth as unknown as { oauth?: OAuthApi }).oauth;
  return api && typeof api.getAuthorizationDetails === 'function' ? api : null;
}

async function authRest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_signed_in');
  const e = endpoints(config);
  const res = await fetch(`${e.supabaseUrl.replace(/\/+$/, '')}/auth/v1${path}`, {
    ...init,
    headers: { apikey: e.supabasePublishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(body?.msg ?? body?.error_description ?? body?.error ?? res.status));
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

/** Which Vitana product the assistant asked for. Null = not found / not pending / error. */
export async function lookupAuthorizationInfo(authorizationId: string): Promise<AuthorizationInfo | null> {
  try {
    const { data, error } = await getSupabase().rpc('ai_connection_authorization_info' as never, { p_authorization_id: authorizationId } as never);
    if (error) return null;
    return parseAuthorizationInfo(data);
  } catch {
    return null;
  }
}

/** Records what this assistant may use. Throws on failure: the consent screen must not approve without it. */
export async function grantFromAuthorization(authorizationId: string, categories: GrantCategory[]): Promise<void> {
  const { error } = await getSupabase().rpc('ai_connection_grant_from_authorization' as never, { p_authorization_id: authorizationId, p_categories: categories } as never);
  if (error) throw new Error((error as { message?: string }).message ?? 'grant_failed');
}
