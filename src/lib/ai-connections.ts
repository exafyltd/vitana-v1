/**
 * VTID-05133 — "Connect your AI": a member connects ChatGPT or Claude to their
 * Maxina account (gateway: /mcp/community, /mcp/community/chatgpt).
 *
 * What each connected assistant may use lives in `ai_connection_grants`
 * (platform migration 20261013150000). The member never writes that table
 * directly: the consent screen calls `ai_connection_grant_from_authorization`
 * (the client is resolved server-side from the pending Supabase authorization,
 * never taken from this page), Settings calls `ai_connection_grant_update` /
 * `ai_connection_grant_revoke`. Members read their own rows (RLS).
 *
 * Whether OTHER members' assistants may find this member is the member's own
 * `profile_privacy_settings.ai_discoverable` (default false, this repo's
 * migration 20261013160000).
 */
import { GATEWAY_BASE } from '@/lib/gateway-base';
import { supabase } from '@/integrations/supabase/client';

export const COMMUNITY_CATEGORIES = ['profile', 'matches', 'people', 'activities'] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];
export type GrantCategory = CommunityCategory | 'commerce';

export const COMMUNITY_MCP_URL = `${GATEWAY_BASE}/mcp/community`;
export const COMMUNITY_MCP_CHATGPT_URL = `${GATEWAY_BASE}/mcp/community/chatgpt`;
export const COMMUNITY_MCP_METADATA_URL = `${GATEWAY_BASE}/.well-known/oauth-protected-resource/mcp/community`;

/** Untyped access: these tables/functions are newer than the generated Supabase types. */
const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  auth: typeof supabase.auth;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** True when the gateway serves the Community connector. Any error → false (no button that leads nowhere). */
export async function fetchCommunityMcpReady(fetchFn: FetchLike = (u, i) => fetch(u, i)): Promise<boolean> {
  try {
    const res = await fetchFn(COMMUNITY_MCP_METADATA_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { resource?: unknown; authorization_servers?: unknown };
    return (
      typeof body.resource === 'string' &&
      body.resource.endsWith('/mcp/community') &&
      Array.isArray(body.authorization_servers) &&
      body.authorization_servers.length > 0
    );
  } catch {
    return false;
  }
}

// ==================== Consent ====================

export type ConnectProduct = 'community' | 'commerce' | 'unknown';

export interface AuthorizationInfo {
  clientId: string;
  clientName: string | null;
  redirectHost: string | null;
  product: ConnectProduct;
}

export function parseAuthorizationInfo(data: unknown): AuthorizationInfo | null {
  const d = (data ?? null) as Record<string, unknown> | null;
  if (!d || typeof d.client_id !== 'string') return null;
  const product = d.product === 'community' || d.product === 'commerce' ? d.product : 'unknown';
  return {
    clientId: d.client_id,
    clientName: typeof d.client_name === 'string' && d.client_name.trim() ? d.client_name.trim() : null,
    redirectHost: typeof d.redirect_host === 'string' ? d.redirect_host : null,
    product,
  };
}

/** Which Vitana product the assistant asked for, from the pending authorization. Null = not found / not pending / error. */
export async function lookupAuthorizationInfo(authorizationId: string): Promise<AuthorizationInfo | null> {
  try {
    const { data, error } = await db.rpc('ai_connection_authorization_info', { p_authorization_id: authorizationId });
    if (error) return null;
    return parseAuthorizationInfo(data);
  } catch {
    return null;
  }
}

/** Records what this assistant may use. Throws on failure: the consent screen must not approve without it. */
export async function grantFromAuthorization(authorizationId: string, categories: GrantCategory[]): Promise<void> {
  const { error } = await db.rpc('ai_connection_grant_from_authorization', {
    p_authorization_id: authorizationId,
    p_categories: categories,
  });
  if (error) throw new Error(error.message ?? 'grant_failed');
}

// ==================== Settings: connected assistants ====================

export interface AiConnection {
  clientId: string;
  clientName: string | null;
  redirectHost: string | null;
  categories: GrantCategory[];
  createdAt: string | null;
  revokedAt: string | null;
}

export function parseConnections(rows: unknown): AiConnection[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof (r as Record<string, unknown>).client_id === 'string')
    .map((r) => ({
      clientId: r.client_id as string,
      clientName: typeof r.client_name === 'string' ? r.client_name : null,
      redirectHost: typeof r.redirect_host === 'string' ? r.redirect_host : null,
      categories: (Array.isArray(r.categories) ? r.categories : []).filter((c): c is GrantCategory =>
        [...COMMUNITY_CATEGORIES, 'commerce'].includes(c as string),
      ),
      createdAt: typeof r.created_at === 'string' ? r.created_at : null,
      revokedAt: typeof r.revoked_at === 'string' ? r.revoked_at : null,
    }));
}

/** The member's own connected assistants, active first. */
export async function listAiConnections(): Promise<AiConnection[]> {
  const { data, error } = await db
    .from('ai_connection_grants')
    .select('client_id, client_name, redirect_host, categories, created_at, revoked_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message ?? 'list_failed');
  const all = parseConnections(data);
  return [...all.filter((c) => !c.revokedAt), ...all.filter((c) => c.revokedAt)];
}

export async function updateAiConnection(clientId: string, categories: GrantCategory[]): Promise<void> {
  const { error } = await db.rpc('ai_connection_grant_update', { p_client_id: clientId, p_categories: categories });
  if (error) throw new Error(error.message ?? 'update_failed');
}

export async function revokeAiConnection(clientId: string): Promise<void> {
  const { error } = await db.rpc('ai_connection_grant_revoke', { p_client_id: clientId });
  if (error) throw new Error(error.message ?? 'revoke_failed');
}

// ==================== Being found by other members' assistants ====================

export async function getAiDiscoverable(): Promise<boolean> {
  const { data: auth } = await db.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  const { data, error } = await db.from('profile_privacy_settings').select('ai_discoverable').eq('user_id', uid).maybeSingle();
  if (error) throw new Error(error.message ?? 'read_failed');
  return (data as { ai_discoverable?: unknown } | null)?.ai_discoverable === true;
}

export async function setAiDiscoverable(value: boolean): Promise<void> {
  const { data: auth } = await db.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('not_signed_in');
  const { error } = await db
    .from('profile_privacy_settings')
    .upsert({ user_id: uid, ai_discoverable: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message ?? 'write_failed');
}
