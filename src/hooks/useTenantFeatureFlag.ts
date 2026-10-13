import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

/**
 * VTID-05105 — member-readable tenant feature flag.
 *
 * Generalises useEventGameFeatureFlag() (src/hooks/useEventGame.ts): a direct
 * Supabase read of tenant_settings.feature_flags, deliberately NOT
 * useTenantSettings() (that hook calls an admin-gated gateway route). The
 * `tenant_read` RLS policy lets any authenticated tenant member SELECT the row.
 *
 * One query per tenant is shared by every flag key; each caller selects its
 * own key. Unknown / missing flags read as `false`.
 */
export function tenantFeatureFlagsQueryKey(tenantId: string | null | undefined) {
  return ['tenant-feature-flags', tenantId ?? null] as const;
}

export function useTenantFeatureFlag(key: string): boolean {
  const { activeTenantId } = useTenant();
  const { data } = useQuery({
    queryKey: tenantFeatureFlagsQueryKey(activeTenantId),
    queryFn: async () => {
      if (!activeTenantId) return {} as Record<string, unknown>;
      const { data: row, error } = await supabase
        .from('tenant_settings' as never)
        .select('feature_flags')
        .eq('tenant_id', activeTenantId as never)
        .maybeSingle();
      if (error) throw error;
      return ((row as unknown as { feature_flags?: Record<string, unknown> } | null)?.feature_flags ?? {}) as Record<string, unknown>;
    },
    enabled: !!activeTenantId,
    staleTime: 60_000,
  });
  return data?.[key] === true;
}
