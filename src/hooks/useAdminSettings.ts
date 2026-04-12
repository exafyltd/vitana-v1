/**
 * Settings hooks — calls /api/v1/admin/tenants/:tenantId/settings
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface TenantSettings {
  tenant_id: string;
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  integrations: Record<string, unknown>;
  domains: Record<string, unknown>;
  billing: Record<string, unknown>;
}

export function useTenantSettings() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-settings", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/settings`);
      return json.settings as TenantSettings;
    },
    enabled: !!activeTenantId,
  });
}

export function useUpdateTenantSettings() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<TenantSettings>) => {
      if (!activeTenantId) throw new Error("No active tenant");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings", activeTenantId] });
    },
  });
}
