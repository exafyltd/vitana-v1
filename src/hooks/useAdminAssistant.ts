/**
 * Batch 1.B2: React Query hooks for the Assistant admin section.
 *
 * Calls /api/v1/admin/tenants/:tenantId/assistant/* on the gateway.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface SurfaceConfig {
  surface_key: string;
  global_defaults: Record<string, unknown>;
  global_config: Record<string, unknown>;
  global_is_customized: boolean;
  tenant_override: Record<string, unknown> | null;
  effective_config: Record<string, unknown>;
  has_tenant_override: boolean;
}

export function useAssistantSurfaces() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-assistant-surfaces", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant`);
      return json.surfaces as SurfaceConfig[];
    },
    enabled: !!activeTenantId,
  });
}

export function useAssistantSurface(surfaceKey: string | null) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-assistant-surface", activeTenantId, surfaceKey],
    queryFn: async () => {
      if (!activeTenantId || !surfaceKey) return null;
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/${surfaceKey}`);
    },
    enabled: !!activeTenantId && !!surfaceKey,
  });
}

export function useUpdateAssistantSurface() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ surfaceKey, updates }: { surfaceKey: string; updates: Record<string, unknown> }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/${surfaceKey}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assistant-surfaces"] });
      qc.invalidateQueries({ queryKey: ["admin-assistant-surface"] });
    },
  });
}

export function useDeleteAssistantOverride() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surfaceKey: string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/assistant/${surfaceKey}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assistant-surfaces"] });
      qc.invalidateQueries({ queryKey: ["admin-assistant-surface"] });
    },
  });
}
