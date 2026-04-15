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

// ── Types ──────────────────────────────────────────────────

export interface NotificationCategory {
  id: string;
  tenant_id: string | null;
  type: "chat" | "calendar" | "community";
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  default_enabled: boolean;
  mapped_types: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CategoriesGrouped {
  chat: NotificationCategory[];
  calendar: NotificationCategory[];
  community: NotificationCategory[];
}

// ── List Categories ────────────────────────────────────────

interface ListFilters {
  type?: string;
  tenant_id?: string;
  include_inactive?: boolean;
}

export function useNotificationCategories(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ["admin-notification-categories", filters],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.tenant_id) params.set("tenant_id", filters.tenant_id);
      if (filters.include_inactive) params.set("include_inactive", "true");

      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notification-categories?${params}`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to fetch categories");
      }
      const json = await res.json();
      return json.data as CategoriesGrouped;
    },
  });
}

// ── Create Category ────────────────────────────────────────

interface CreatePayload {
  type: string;
  display_name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  default_enabled?: boolean;
  mapped_types?: string[];
  tenant_id?: string;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notification-categories`,
        { method: "POST", headers, body: JSON.stringify(payload) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.message || err.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notification-categories"] });
    },
  });
}

// ── Update Category ────────────────────────────────────────

interface UpdatePayload {
  id: string;
  display_name?: string;
  description?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  default_enabled?: boolean;
  mapped_types?: string[];
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePayload) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notification-categories/${id}`,
        { method: "PATCH", headers, body: JSON.stringify(data) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.message || err.error || "Failed to update category");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notification-categories"] });
    },
  });
}

// ── Delete Category (soft-delete) ──────────────────────────

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notification-categories/${id}`,
        { method: "DELETE", headers }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to delete category");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notification-categories"] });
    },
  });
}

// ── Send Test Notification ─────────────────────────────────

export function useSendTestNotification() {
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}/api/v1/admin/notification-categories/${categoryId}/test`,
        { method: "POST", headers }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to send test notification");
      }
      return res.json();
    },
  });
}
