/**
 * Wave 2: Insights admin hooks
 * Reuses overview summary + admin signups data for growth/engagement metrics
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";

export interface SignupReport {
  total: number;
  by_day: Array<{ date: string; count: number }>;
  by_source: Record<string, number>;
}

export function useSignupReport() {
  return useQuery({
    queryKey: ["admin-signup-report"],
    queryFn: async () => {
      try {
        const json = await adminFetch("/api/v1/admin/signups");
        return json as SignupReport;
      } catch {
        return null;
      }
    },
  });
}
