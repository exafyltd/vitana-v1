/**
 * Audit hooks — calls /api/v1/admin/tenants/:tenantId/audit/*
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface AuditAction {
  id: string;
  actor_user_id: string;
  action: string;
  target_resource: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export interface AccessLogEntry {
  id: string;
  topic: string;
  vtid: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useAuditActions(opts?: { action?: string; limit?: number }) {
  const { activeTenantId } = useTenant();
  const action = opts?.action;
  const limit = opts?.limit ?? 100;
  return useQuery({
    queryKey: ["admin-audit-actions", activeTenantId, action, limit],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const params = new URLSearchParams({ limit: String(limit) });
      if (action) params.set("action", action);
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/audit/actions?${params}`);
      return json.actions as AuditAction[];
    },
    enabled: !!activeTenantId,
  });
}

export function useAccessLog(limit: number = 100) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-audit-access", activeTenantId, limit],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/audit/access?limit=${limit}`);
      return json.access_log as AccessLogEntry[];
    },
    enabled: !!activeTenantId,
  });
}
