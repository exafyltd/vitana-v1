/**
 * Community admin hooks
 * Calls /api/v1/admin/moderation/* and /api/v1/admin/tenants/:tenantId/community/*
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { useTenant } from "@/hooks/useTenant";

export interface ModerationReport {
  id: string;
  content_type: string;
  content_id: string;
  reporter_user_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export function useModerationReports() {
  return useQuery({
    queryKey: ["admin-moderation-reports"],
    queryFn: async () => {
      try {
        const json = await adminFetch("/api/v1/admin/moderation/reports");
        return (json.reports || json.data || []) as ModerationReport[];
      } catch {
        return [];
      }
    },
  });
}

export function useCommunityMeetups() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-community-meetups", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      try {
        const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/meetups`);
        return json.meetups || [];
      } catch { return []; }
    },
    enabled: !!activeTenantId,
  });
}

export function useCommunityGroups() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-community-groups", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      try {
        const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/groups`);
        return json.groups || [];
      } catch { return []; }
    },
    enabled: !!activeTenantId,
  });
}

export function useCommunityLiveRooms() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-community-live-rooms", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      try {
        const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/live-rooms`);
        return json.rooms || [];
      } catch { return []; }
    },
    enabled: !!activeTenantId,
  });
}

export function useCommunityCreators() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-community-creators", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      try {
        const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/creators`);
        return json.creators || [];
      } catch { return []; }
    },
    enabled: !!activeTenantId,
  });
}

export function useDeleteEvent() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!activeTenantId) throw new Error("NO_TENANT");
      return adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/meetups/${eventId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-meetups"] });
    },
  });
}
