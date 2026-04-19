/**
 * VTID-02403: AI Assistants (ChatGPT + Claude) — Phase 1 hooks
 *
 * Wraps /api/v1/integrations/ai-assistants endpoints via TanStack Query.
 *
 * NOTE: The backend NEVER returns raw API keys. This hook only handles the
 * paste + verify flow and reads back key_prefix + key_last4 metadata.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// VITE_GATEWAY_URL in this repo already includes "/api/v1"; VITE_GATEWAY_BASE is bare origin.
// Normalize to bare origin so we can append specific paths cleanly.
const GATEWAY_BASE = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "") ||
  ""
).replace(/\/+$/, "");

const BASE_PATH = "/api/v1/integrations/ai-assistants";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// =============================================================================
// Types
// =============================================================================

export type AIProviderId = "chatgpt" | "claude";

export interface AIProvider {
  provider: AIProviderId;
  display_name: string;
  description: string | null;
  docs_url: string | null;
  capabilities: string[];
  auth_type: string;
  status: "connected" | "available" | "disabled";
  connection_id: string | null;
  last_verified_at: string | null;
  last_verify_status: string | null;
  allowed_models: string[];
  cost_cap_usd_month: number | null;
}

export interface AIConnection {
  connection_id: string;
  provider: AIProviderId;
  status: "connected" | "disconnected";
  key_prefix: string | null;
  key_last4: string | null;
  last_verified_at: string | null;
  last_verify_status: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
}

// =============================================================================
// Queries
// =============================================================================

export function useAIProviders() {
  return useQuery({
    queryKey: ["ai-assistants", "providers"],
    queryFn: async (): Promise<AIProvider[]> => {
      const headers = await authHeaders();
      const res = await fetch(`${GATEWAY_BASE}${BASE_PATH}/providers`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load AI providers: ${res.status}`);
      }
      const body = await res.json();
      if (!body.ok) throw new Error(body.error || "AI_PROVIDERS_ERROR");
      return (body.providers || []) as AIProvider[];
    },
    staleTime: 30_000,
  });
}

export function useAIConnections() {
  return useQuery({
    queryKey: ["ai-assistants", "connections"],
    queryFn: async (): Promise<AIConnection[]> => {
      const headers = await authHeaders();
      const res = await fetch(`${GATEWAY_BASE}${BASE_PATH}/connections`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load AI connections: ${res.status}`);
      }
      const body = await res.json();
      if (!body.ok) throw new Error(body.error || "AI_CONNECTIONS_ERROR");
      return (body.connections || []) as AIConnection[];
    },
    staleTime: 10_000,
  });
}

// =============================================================================
// Mutations
// =============================================================================

export function useConnectAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId; api_key: string }) => {
      const headers = await authHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}${BASE_PATH}/apikey/${encodeURIComponent(params.provider)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ api_key: params.api_key }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        throw new Error(body.error || `CONNECT_FAILED_${res.status}`);
      }
      return body as { ok: true; connection_id: string; key_prefix: string; key_last4: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-assistants"] });
    },
  });
}

export function useVerifyAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId }) => {
      const headers = await authHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}${BASE_PATH}/verify/${encodeURIComponent(params.provider)}`,
        { method: "POST", headers }
      );
      const body = await res.json().catch(() => ({}));
      // verify returns 200 even on auth fail (ok=false with reason); only throw on transport issues
      if (!res.ok && res.status >= 500) {
        throw new Error(body.error || `VERIFY_FAILED_${res.status}`);
      }
      return body as {
        ok: boolean;
        provider: string;
        status: "ok" | "unauthorized" | "network" | "error";
        http_status: number;
        latency_ms: number;
        error: string | null;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-assistants"] });
    },
  });
}

export function useDisconnectAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: AIProviderId }) => {
      const headers = await authHeaders();
      const res = await fetch(
        `${GATEWAY_BASE}${BASE_PATH}/${encodeURIComponent(params.provider)}`,
        { method: "DELETE", headers }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        throw new Error(body.error || `DISCONNECT_FAILED_${res.status}`);
      }
      return body as { ok: true; provider: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-assistants"] });
    },
  });
}
