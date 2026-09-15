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

// NOTE: the gateway's community-admin routes (`/meetups`, `/groups`,
// `/live-rooms`, `/creators`) all report a Supabase query failure the same
// way: HTTP 200, `{ ok: true, <key>: [], error: "<message>" }` — the empty
// array keeps old clients from crashing, but it is indistinguishable from a
// genuinely empty table unless `error` is checked. `adminFetch` only throws
// on a non-2xx response or a network failure, so it never surfaces this.
// Throwing here on a present `error` field routes it into React Query's own
// `isError`/`error`, which the pages already know how to render.
export function useCommunityMeetups() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ["admin-community-meetups", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/meetups`);
      if (json.error) throw new Error(json.error);
      return json.meetups || [];
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
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/groups`);
      if (json.error) throw new Error(json.error);
      return json.groups || [];
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
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/live-rooms`);
      if (json.error) throw new Error(json.error);
      return json.rooms || [];
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
      const json = await adminFetch(`/api/v1/admin/tenants/${activeTenantId}/community/creators`);
      if (json.error) throw new Error(json.error);
      return json.creators || [];
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
