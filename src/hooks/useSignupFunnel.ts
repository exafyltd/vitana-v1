import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE =
  import.meta.env.VITE_GATEWAY_BASE || "";
const API_BASE = `${GATEWAY_BASE}/api/v1`;

// ---------------------------------------------------------------------------
// Helper: authenticated fetch against Gateway
// ---------------------------------------------------------------------------

async function gatewayFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Request failed" }));
    const errorMsg =
      error.message || error.error || `Request failed: ${response.status}`;
    throw new Error(errorMsg);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignupFunnelStats {
  total_attempts: number;
  completed: number;
  pending: number;
  failed: number;
  invited: number;
  conversion_rate: number;
  daily_breakdown: Array<{
    date: string;
    attempts: number;
    completed: number;
  }>;
}

export interface SignupAttempt {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  error_message: string | null;
  tenant_id: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignupInvitation {
  id: string;
  email: string;
  status: string;
  invited_by: string;
  tenant_id: string;
  role: string | null;
  expires_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

interface UseSignupFunnelOptions {
  days?: number;
  tenant_id?: string;
}

export function useSignupFunnel(options?: UseSignupFunnelOptions) {
  const days = options?.days ?? 30;
  const tenant_id = options?.tenant_id ?? "";

  return useQuery({
    queryKey: ["signup-funnel-stats", days, tenant_id],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("days", String(days));
      if (tenant_id) params.set("tenant_id", tenant_id);

      const res = await gatewayFetch(
        `/admin/signups/stats?${params.toString()}`
      );
      const json = await res.json();
      return json.data as SignupFunnelStats;
    },
  });
}

interface UseSignupAttemptsOptions {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useSignupAttempts(options?: UseSignupAttemptsOptions) {
  const status = options?.status ?? "";
  const search = options?.search ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  return useQuery({
    queryKey: ["signup-attempts", status, search, page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));

      const res = await gatewayFetch(
        `/admin/signups/attempts?${params.toString()}`
      );
      const json = await res.json();
      return {
        attempts: (json.data?.attempts ?? json.data ?? []) as SignupAttempt[],
        total: (json.data?.total ?? 0) as number,
      };
    },
  });
}

interface UseSignupInvitationsOptions {
  status?: string;
  page?: number;
  pageSize?: number;
}

export function useSignupInvitations(options?: UseSignupInvitationsOptions) {
  const status = options?.status ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  return useQuery({
    queryKey: ["signup-invitations", status, page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));

      const res = await gatewayFetch(
        `/admin/signups/invitations?${params.toString()}`
      );
      const json = await res.json();
      return {
        invitations: (json.data?.invitations ?? json.data ?? []) as SignupInvitation[],
        total: (json.data?.total ?? 0) as number,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await gatewayFetch(`/admin/signups/${id}/invite`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signup-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["signup-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["signup-funnel-stats"] });
    },
  });
}

export function useRepairProvisioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await gatewayFetch(`/admin/signups/${id}/repair`, {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signup-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["signup-funnel-stats"] });
    },
  });
}
