/**
 * VTID-05186 (N3, plan change 11) — native twin of src/hooks/useRole.tsx:35-80.
 * `get_role_preference` / `set_role_preference` with the same optimistic
 * update + rollback, `role.changed` on the native event bus. The stored
 * preference (dbRole) is the active MODE on mobile (VTID-03993).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../ports/core';
import { getSupabase } from '../auth/client';
import { overlayBus } from '../navigation/overlay-bus';
import { useTenant } from './TenantProvider';

export function useRole() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const key = ['rolePref', activeTenantId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_role_preference', { p_tenant_id: activeTenantId });
      if (error) throw error;
      return ((data as Array<{ role: UserRole }> | null)?.[0]?.role ?? null) as UserRole | null;
    },
    enabled: !!activeTenantId,
  });

  const setRole = async (role: UserRole): Promise<{ ok: boolean; error?: string }> => {
    if (!activeTenantId) return { ok: false, error: 'NO_ACTIVE_TENANT' };
    const previous = queryClient.getQueryData<UserRole | null>(key) ?? null;
    queryClient.setQueryData(key, role);
    overlayBus.emit('role.changed', { from: previous, to: role });
    const { error } = await getSupabase().rpc('set_role_preference', { p_tenant_id: activeTenantId, p_role: role });
    if (error) {
      queryClient.setQueryData(key, previous);
      overlayBus.emit('role.changed', { from: role, to: previous });
      return { ok: false, error: error.message };
    }
    void queryClient.invalidateQueries({ queryKey: key });
    return { ok: true };
  };

  const dbRole: UserRole = (query.data as UserRole | null) || 'community';
  return { dbRole, setRole, isLoading: query.isLoading };
}
