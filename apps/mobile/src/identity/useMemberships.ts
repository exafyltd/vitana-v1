/**
 * VTID-05186 (N3, plan change 11) — src/hooks/useMemberships.ts:28-58 for a
 * tenant: `get_my_permitted_roles`, falling back to
 * `list_roles_for_active_tenant` so the switcher never disappears.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../auth/client';

export async function fetchPermittedRoles(tenantId: string): Promise<string[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('get_my_permitted_roles');
    if (error) throw error;
    const payload = data as { ok?: boolean; roles?: string[]; error?: string } | null;
    if (!payload?.ok) throw new Error(payload?.error || 'FAILED_TO_LOAD_ROLES');
    return payload.roles ?? [];
  } catch {
    const { data, error } = await supabase.rpc('list_roles_for_active_tenant', { p_tenant_id: tenantId });
    if (error) throw error;
    return ((data as Array<{ role: string }> | null) ?? []).map((r) => r.role);
  }
}

export function useMemberships(tenantId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['memberships', tenantId],
    queryFn: () => fetchPermittedRoles(tenantId as string),
    enabled: !!tenantId,
  });
  return { roles: query.data, isLoading: query.isLoading };
}
