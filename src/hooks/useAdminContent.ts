/**
 * Content Moderation hooks
 * Calls /api/v1/admin/tenants/:tenantId/content/* on the gateway
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface ContentItem {
  id: string;
  tenant_id: string;
  content_type: string;
  title: string;
  description: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  category: string | null;
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  moderation_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  submitted_by: string;
  submitted_at: string;
  published_at: string | null;
}

export interface ContentStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export function useContentItems(params: { status?: string; type?: string } = {}) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-content-items", activeTenantId, params],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.type) qs.set("type", params.type);
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/content/items?${qs}`);
      return json.items as ContentItem[];
    },
    enabled: !!activeTenantId,
  });
}

export function useContentStats() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-content-stats", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/content/items/stats`);
      return json as ContentStats;
    },
    enabled: !!activeTenantId,
  });
}

export function useModerateContent() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "approve" | "reject" | "flag" | "archive"; reason?: string }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/content/items/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason, note: reason }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content-items"] });
      qc.invalidateQueries({ queryKey: ["admin-content-stats"] });
    },
  });
}
