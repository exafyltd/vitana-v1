/**
 * Overview Dashboard hooks — calls /api/v1/admin/tenants/:tenantId/overview/*
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface OverviewSummary {
  kpi: {
    total_members: number;
    new_signups_7d: number;
    new_signups_delta_pct: number;
    pending_invitations: number;
    kb_documents: number;
  };
  role_distribution: Record<string, number>;
  action_inbox: {
    pending_invitations: number;
  };
  generated_at: string;
}

export interface AtRiskMember {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen: string;
}

export interface OasisEvent {
  id: string;
  topic: string;
  vtid: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useOverviewSummary() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-overview-summary", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/overview/summary`);
      return json as { ok: boolean; cached: boolean } & OverviewSummary;
    },
    enabled: !!activeTenantId,
    refetchInterval: 60_000, // match backend cache TTL
  });
}

export function useAtRiskMembers() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-overview-at-risk", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/overview/at-risk`);
      return json.at_risk as AtRiskMember[];
    },
    enabled: !!activeTenantId,
  });
}

export function useOverviewActivity(limit: number = 50) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-overview-activity", activeTenantId, limit],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/overview/activity?limit=${limit}`);
      return json.events as OasisEvent[];
    },
    enabled: !!activeTenantId,
  });
}

export function useOverviewAlerts() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-overview-alerts", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/overview/alerts`);
      return json.alerts as OasisEvent[];
    },
    enabled: !!activeTenantId,
    refetchInterval: 30_000, // alerts refresh more frequently
  });
}
