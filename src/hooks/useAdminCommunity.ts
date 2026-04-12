/**
 * Wave 2: Community admin hooks
 * Calls /api/v1/admin/moderation/* on the gateway
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";

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
