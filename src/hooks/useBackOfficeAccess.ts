/**
 * VTID-03834 — BackOffice ERP capability access (frontend side).
 *
 * All data comes from the gateway (`/api/v1/backoffice/*`, adminFetch); the
 * browser never touches `erp_capability_grants` directly. The gateway ENFORCES;
 * these hooks only let the UI reflect what the caller may do.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface ErpAccessMe {
  ok: boolean;
  user_id: string;
  tenant_id: string | null;
  role: string | null;
  is_exafy_admin: boolean;
  capabilities: string[];
  defaults: string[];
  explicit: string[];
  can_manage_access: boolean;
  catalog: string[];
}

export interface ErpGrantDetail {
  user_id: string;
  tenant_id: string;
  capability: string;
  granted_by: string | null;
  granted_at: string;
}

export interface ErpAccessList {
  ok: boolean;
  tenant_id: string;
  catalog: string[];
  users: Array<{ user_id: string; capabilities: string[]; details: ErpGrantDetail[] }>;
}

/** Caller's effective ERP capabilities. `enabled` lets AppLayout ask only on /backoffice. */
export function useMyErpAccess(enabled = true) {
  const { activeTenantId } = useTenant();
  return useQuery<ErpAccessMe>({
    queryKey: ["backoffice-access-me", activeTenantId],
    queryFn: async () => (await adminFetch(`/api/v1/backoffice/me`)) as ErpAccessMe,
    enabled,
    staleTime: 60_000,
  });
}

export function useErpAccessList() {
  const { activeTenantId } = useTenant();
  return useQuery<ErpAccessList>({
    queryKey: ["backoffice-access-list", activeTenantId],
    queryFn: async () => (await adminFetch(`/api/v1/backoffice/access`)) as ErpAccessList,
  });
}

export function useGrantErpCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, capability }: { userId: string; capability: string }) =>
      adminFetch(`/api/v1/backoffice/access/grant`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, capability }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backoffice-access-list"] });
      qc.invalidateQueries({ queryKey: ["backoffice-access-me"] });
    },
  });
}

export function useRevokeErpCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, capability }: { userId: string; capability: string }) =>
      adminFetch(`/api/v1/backoffice/access/revoke`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, capability }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backoffice-access-list"] });
      qc.invalidateQueries({ queryKey: ["backoffice-access-me"] });
    },
  });
}

/** Personal-data capabilities (hr.*, payroll.*) — explicit-only, admin-granted (GOLDEN-WORKFLOWS §3.3). */
export function isExplicitOnlyCapability(capability: string): boolean {
  const domain = capability.split(".")[0];
  return domain === "hr" || domain === "payroll";
}
