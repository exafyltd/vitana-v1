/**
 * Batch 1.B1: React Query hooks for the Members admin section.
 *
 * Calls:
 *  - /api/v1/admin/users (tenant-scoped via dual-mode auth)
 *  - /api/v1/admin/users/roles-summary
 *  - /api/v1/admin/users/:userId
 *  - /api/v1/roles/grant, /api/v1/roles/revoke
 *  - /api/v1/admin/tenants/:tenantId/invitations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

// ── Types ─────────────────────────────────────────────────────

export interface MemberRow {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  active_role: string | null;
  tenant_name: string | null;
  tenant_id: string | null;
  is_primary: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  memberships: Array<{
    tenant_id: string;
    tenant_name: string | null;
    tenant_slug: string | null;
    active_role: string;
    is_primary: boolean;
  }>;
}

export interface RoleSummary {
  role: string;
  user_count: number;
}

export interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  roles: string[];
  token: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

// ── Members list ──────────────────────────────────────────────

export function useMembers(params: { query?: string; role?: string; limit?: number; offset?: number } = {}) {
  const { query, role, limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ["admin-members", { query, role, limit, offset }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (query) qs.set("query", query);
      if (role && role !== "all") qs.set("role", role);
      qs.set("limit", String(limit));
      qs.set("offset", String(offset));
      const json = await adminFetch(`/api/v1/admin/users?${qs.toString()}`);
      return json.users as MemberRow[];
    },
  });
}

export function useMember(userId: string | null) {
  return useQuery({
    queryKey: ["admin-member", userId],
    queryFn: async () => {
      if (!userId) return null;
      const json = await adminFetch(`/api/v1/admin/users/${userId}`);
      return json.user as MemberRow;
    },
    enabled: !!userId,
  });
}

export function useRolesSummary() {
  return useQuery({
    queryKey: ["admin-roles-summary"],
    queryFn: async () => {
      const json = await adminFetch(`/api/v1/admin/users/roles-summary`);
      return json.roles as RoleSummary[];
    },
  });
}

// ── Role grant / revoke ───────────────────────────────────────

export function useGrantRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tenantId, role }: { userId: string; tenantId: string; role: string }) => {
      return adminFetch(`/api/v1/roles/grant`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, tenant_id: tenantId, role }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-member"] });
      qc.invalidateQueries({ queryKey: ["admin-roles-summary"] });
    },
  });
}

export function useRevokeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tenantId, role }: { userId: string; tenantId: string; role: string }) => {
      return adminFetch(`/api/v1/roles/revoke`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, tenant_id: tenantId, role }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-member"] });
      qc.invalidateQueries({ queryKey: ["admin-roles-summary"] });
    },
  });
}

// ── Invitations ───────────────────────────────────────────────

export function useInvitations(status?: string) {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-invitations", activeTenantId, status],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const qs = status ? `?status=${status}` : "";
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/invitations${qs}`);
      return json.invitations as InvitationRow[];
    },
    enabled: !!activeTenantId,
  });
}

export function useCreateInvitation() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, roles, message }: { email: string; roles: string[]; message?: string }) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, roles, message }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
  });
}

export function useRevokeInvitation() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/invitations/${invitationId}/revoke`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
    },
  });
}
