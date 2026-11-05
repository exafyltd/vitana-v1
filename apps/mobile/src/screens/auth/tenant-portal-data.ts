/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the
 * class-B reads of the generic community portal (src/pages/portals/TenantPortal.tsx,
 * src/lib/tenant-registry.ts), re-implemented natively because the web module
 * imports the Supabase client:
 *
 * - `fetchTenantBySlug` — `resolve_tenant(p_slug)` as a GET RPC, rows through
 *   `@vitana/core`'s `normalizeEntry` (tenant-registry.ts:217-223);
 * - `fetchMembership` — the signed-in visitor's own `user_tenants` row (a read,
 *   select-own policy; TenantPortal.tsx membership query);
 * - `tenantAssetUrl` — tenant-registry.ts `assetUrl`: the same path check,
 *   then the `tenant-assets` bucket's public URL.
 *
 * All reads; the only write on the portal is sign-in / sign-up (src/auth/sign-in.ts)
 * and the tenant switch (TenantProvider `setTenantBySlug`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeEntry, type TenantEntry } from '../../ports/core';
import { getSupabase } from '../../auth/client';

export const resolveTenantQueryKey = (slug: string) => ['tenant-registry', 'resolve', slug] as const;
export const membershipQueryKey = (userId: string | undefined, tenantId: string) => ['tenant-portal-membership', userId, tenantId] as const;

export async function fetchTenantBySlug(slug: string, supabase: SupabaseClient = getSupabase()): Promise<TenantEntry | null> {
  const { data, error } = await supabase.rpc('resolve_tenant', { p_slug: slug }, { get: true });
  if (error) throw error;
  const rows = ((data ?? []) as unknown[]).map(normalizeEntry).filter((e): e is TenantEntry => !!e);
  return rows[0] ?? null;
}

export async function fetchMembership(userId: string, tenantId: string, supabase: SupabaseClient = getSupabase()): Promise<boolean> {
  const { data, error } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', userId).eq('tenant_id', tenantId).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** tenant-registry.ts ASSET_PATH_RE. */
const ASSET_PATH_RE = /^[a-z0-9][a-z0-9-]{1,39}\/[A-Za-z0-9._/-]+$/;

export function tenantAssetUrl(path: unknown, slug?: string, supabase: SupabaseClient = getSupabase()): string | undefined {
  if (typeof path !== 'string' || !ASSET_PATH_RE.test(path) || path.split('/').includes('..')) return undefined;
  if (slug && !path.startsWith(`${slug}/`)) return undefined;
  return supabase.storage.from('tenant-assets').getPublicUrl(path).data.publicUrl;
}
