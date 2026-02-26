import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Compose (send) ─────────────────────────────────────────

interface ComposePayload {
  recipient_ids?: string[];
  recipient_role?: string;
  tenant_id?: string;
  send_to_all?: boolean;
  type: string;
  title: string;
  body: string;
  channel?: string;
  priority?: string;
  data?: Record<string, string>;
}

export function useComposeNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ComposePayload) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${GATEWAY_BASE}/api/v1/admin/notifications/compose`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to send notification");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications-sent"] });
    },
  });
}

// ── Sent Log ────────────────────────────────────────────────

interface SentFilters {
  type?: string;
  user_id?: string;
  search?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}

export function useSentNotifications(filters: SentFilters = {}) {
  const { type, user_id, search, days = 30, page = 0, pageSize = 50 } = filters;

  return useQuery({
    queryKey: ["admin-notifications-sent", { type, user_id, search, days, page, pageSize }],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      params.set("days", String(days));
      if (type) params.set("type", type);
      if (user_id) params.set("user_id", user_id);
      if (search) params.set("search", search);

      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notifications/sent?${params}`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to fetch sent notifications");
      }
      return res.json();
    },
  });
}

// ── Preference Stats ────────────────────────────────────────

export function useNotificationPreferenceStats(tenantId?: string) {
  return useQuery({
    queryKey: ["admin-notifications-prefs", tenantId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (tenantId) params.set("tenant_id", tenantId);

      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notifications/preferences/stats?${params}`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to fetch preference stats");
      }
      return res.json();
    },
  });
}
