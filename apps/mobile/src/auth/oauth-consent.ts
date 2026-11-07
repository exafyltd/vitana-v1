/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * request and decision of the `/oauth/consent` screen (src/pages/OAuthConsent.tsx,
 * VTID-03546): the Vitanaland MCP authorization server 302s to the consent
 * page with the authorize parameters; the member ticks the scopes they
 * approve and the decision goes back to the AS, which answers with the client
 * redirect.
 *
 * The web defaults the AS to the production `mcp.vitanaland.com`. Native has
 * no default: the AS comes from `EXPO_PUBLIC_MCP_AS_URL`, unset →
 * ConfigMissingError(['mcpAsUrl']) (the ConfigMissing screen), and any
 * `vitanaland.com` host or a host `assertNotProduction` refuses is refused
 * too — a native dev/test build never reaches production.
 */
import { ConfigMissingError, assertNotProduction } from '../ports/env';

/** OAuthConsent.tsx PARAM_KEYS — the only parameters forwarded to the AS. */
export const CONSENT_PARAM_KEYS = ['client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'resource'] as const;

export type ConsentRequest = {
  params: Record<string, string>;
  clientName: string;
  scopes: string[];
  valid: boolean;
};

type Search = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseConsentRequest(search: Search): ConsentRequest {
  const params: Record<string, string> = {};
  for (const k of CONSENT_PARAM_KEYS) {
    const v = first(search[k]);
    if (v) params[k] = v;
  }
  const clientName = first(search.client_name) || params.client_id || '';
  const scopes = (params.scope ?? '').split(' ').filter(Boolean);
  const valid = Boolean(params.client_id && params.redirect_uri && params.code_challenge);
  return { params, clientName, scopes, valid };
}

const PROD_DOMAIN = /(^|\.)vitanaland\.com$/i;

/** The configured AS base (no trailing slash). Throws ConfigMissingError when unset; refuses production. */
export function consentAsBase(raw: string | undefined = process.env.EXPO_PUBLIC_MCP_AS_URL): string {
  const value = (raw ?? '').trim();
  if (!value) throw new ConfigMissingError(['mcpAsUrl']);
  const host = /^https?:\/\/([^/:?#]+)/i.exec(value)?.[1] ?? '';
  if (!host || PROD_DOMAIN.test(host)) throw new Error(`Refusing ${host || 'an invalid URL'} as the MCP authorization server: native dev/test builds never reach production.`);
  return assertNotProduction(value).replace(/\/+$/, '');
}

export type DecisionResult = { ok: true; redirectTo: string } | { ok: false };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** POST {AS}/oauth/authorize/decision — the body OAuthConsent.tsx sends. */
export async function submitConsentDecision(
  input: { asBase: string; params: Record<string, string>; accessToken: string; approved: boolean; approvedScopes: string[] },
  fetchImpl: FetchLike = fetch,
): Promise<DecisionResult> {
  try {
    const res = await fetchImpl(`${input.asBase}/oauth/authorize/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        params: input.params,
        supabase_access_token: input.approved ? input.accessToken : '',
        approved: input.approved,
        approved_scopes: input.approvedScopes,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { redirect_to?: unknown };
    if (!res.ok || typeof body.redirect_to !== 'string' || !body.redirect_to) return { ok: false };
    return { ok: true, redirectTo: body.redirect_to };
  } catch {
    return { ok: false };
  }
}
