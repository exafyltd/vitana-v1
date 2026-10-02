/**
 * VTID-NAV-02: React Query hook for the Admin Navigator telemetry API.
 *
 * Talks to /api/v1/admin/navigator/telemetry on the gateway (defined in
 * vitana-platform/services/gateway/src/routes/admin-navigator.ts). The
 * endpoint requires a Bearer token with exafy_admin app_metadata.
 *
 * VTID-04853: the catalog editor, coverage, history and simulator hooks are
 * gone with their pages. Vitana's screens now come from the screen registry
 * (src/navigation/registry/), not the nav_catalog table those pages edited.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The gateway base lives in VITE_GATEWAY_URL for this repo. Fall back to
// VITE_GATEWAY_BASE (used by useSignupFunnel hooks) for consistency with the
// existing admin pages.
//
// vitana-v1's .env sets VITE_GATEWAY_URL to include the "/api/v1" suffix
// already (e.g. "https://gateway.vitanaland.com/api/v1"), so we must NOT append
// "/api/v1" again. Strip any trailing "/api/v1" (or trailing slash) from the
// base before building the final URL to make the hook resilient to either
// convention.
const RAW_GATEWAY_BASE =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  (import.meta.env.VITE_GATEWAY_BASE as string | undefined) ||
  "";
const GATEWAY_BASE = RAW_GATEWAY_BASE.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
const API_BASE = `${GATEWAY_BASE}/api/v1/admin/navigator`;

async function authFetch(path: string, init: RequestInit = {}): Promise<any> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("NO_AUTH_TOKEN");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types (mirror backend shapes) ───────────────────────────────────────────

export interface TelemetryReport {
  days: number;
  event_count: number;
  by_type: Record<string, number>;
  top_screens: Array<{ screen_id: string; count: number }>;
  failed_utterances: Array<{ utterance: string; confidence: string; top_picks?: unknown[] }>;
  near_misses: Array<{ utterance: string; picked: unknown; runner_up: unknown; delta: number }>;
}

export function useNavTelemetry(days: number = 30) {
  return useQuery({
    queryKey: ["nav-telemetry", days],
    queryFn: async () => {
      const json = await authFetch(`/telemetry?days=${days}`);
      return json as { ok: boolean } & TelemetryReport;
    },
  });
}
