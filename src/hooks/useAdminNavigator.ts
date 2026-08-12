/**
 * VTID-NAV-02: React Query hooks for the Admin Navigator API.
 *
 * Every hook talks to /api/v1/admin/navigator on the gateway (defined in
 * vitana-platform/services/gateway/src/routes/admin-navigator.ts). The
 * endpoints require a Bearer token with exafy_admin app_metadata.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The gateway base lives in VITE_GATEWAY_URL for this repo. Fall back to
// VITE_GATEWAY_BASE (used by useSignupFunnel hooks) for consistency with the
// existing admin pages.
//
// vitana-v1's .env sets VITE_GATEWAY_URL to include the "/api/v1" suffix
// already (e.g. "https://gateway-…run.app/api/v1"), so we must NOT append
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

export interface NavCatalogI18nRow {
  catalog_id: string;
  lang: string;
  title: string;
  description: string;
  when_to_visit: string;
}

export interface NavOverrideTrigger {
  lang: string;
  phrase: string;
  active: boolean;
}

// BOOTSTRAP-NAV-PLATFORM: the two MAXINA catalogs the Navigator manages.
export type NavPlatform = "mobile" | "desktop";

// BOOTSTRAP-NAV-ROLE: the role-surface a catalog entry belongs to. The desktop
// sidebar is role-based (getRoleNavigation), so each role has its own catalog.
export type NavRole =
  | "community"
  | "patient"
  | "professional"
  | "staff"
  | "admin"
  | "developer"
  | "infra";
export const NAV_ROLES: NavRole[] = [
  "community",
  "patient",
  "professional",
  "staff",
  "admin",
  "developer",
  "infra",
];

export interface NavCatalogRow {
  id: string;
  screen_id: string;
  tenant_id: string | null;
  platform: NavPlatform;
  role: NavRole;
  route: string;
  category: string;
  access: "public" | "authenticated";
  anonymous_safe: boolean;
  priority: number;
  related_kb_topics: string[];
  context_rules: Record<string, unknown>;
  override_triggers: NavOverrideTrigger[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  i18n: NavCatalogI18nRow[];
}

export interface NavAuditRow {
  id: string;
  catalog_id: string | null;
  screen_id: string | null;
  tenant_id: string | null;
  action: "create" | "update" | "delete" | "restore";
  before: unknown;
  after: unknown;
  actor_user_id: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface SpaRoute {
  path: string;
  requires_auth: boolean;
  requires_role?: string;
  notes?: string;
}

export interface SimulateInput {
  utterance: string;
  lang: string;
  current_route?: string;
  recent_routes?: string[];
  is_anonymous?: boolean;
  tenant_id?: string;
}

export interface SimulateResult {
  confidence: "high" | "medium" | "low";
  primary: { screen_id: string; route: string; title: string; score?: number } | null;
  alternative?: { screen_id: string; route: string; title: string; score?: number };
  explanation: string;
  confirmation_needed: boolean;
  suggested_question?: string;
  kb_excerpts: string[];
  blocked_reason?: string;
  top_picks: Array<{ screen_id: string; route: string; title: string; score?: number }>;
  decision_source: "scoring" | "override_trigger" | "static_fallback";
  ms_elapsed: number;
  catalog_match_count: number;
}

export interface CoverageReport {
  tenant_id: string | null;
  platform?: NavPlatform;
  summary: {
    catalog_size: number;
    spa_route_count: number;
    missing_in_catalog: number;
    broken_catalog_routes: number;
    dead_triggers: number;
  };
  missing_in_catalog: Array<{ route: string; requires_auth: boolean }>;
  broken_catalog_routes: Array<{ screen_id: string; route: string; title: string }>;
  dead_triggers: Array<{ screen_id: string; title: string; route: string }>;
}

export interface TelemetryReport {
  days: number;
  event_count: number;
  by_type: Record<string, number>;
  top_screens: Array<{ screen_id: string; count: number }>;
  failed_utterances: Array<{ utterance: string; confidence: string; top_picks?: unknown[] }>;
  near_misses: Array<{ utterance: string; picked: unknown; runner_up: unknown; delta: number }>;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function useNavCatalogList(params: {
  tenantId?: string | null;
  category?: string;
  q?: string;
  platform?: NavPlatform;
  role?: NavRole;
} = {}) {
  const { tenantId, category, q, platform = "mobile", role = "community" } = params;
  return useQuery({
    queryKey: ["nav-catalog", { tenantId, category, q, platform, role }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("platform", platform);
      qs.set("role", role);
      if (tenantId === null) qs.set("tenant_id", "__shared__");
      else if (tenantId) qs.set("tenant_id", tenantId);
      if (category) qs.set("category", category);
      if (q) qs.set("q", q);
      const json = await authFetch(`/catalog?${qs.toString()}`);
      return json.data as NavCatalogRow[];
    },
  });
}

export function useNavCatalogEntry(id: string | null) {
  return useQuery({
    queryKey: ["nav-catalog", "entry", id],
    queryFn: async () => {
      if (!id) return null;
      const json = await authFetch(`/catalog/${id}`);
      return { entry: json.data as NavCatalogRow, audit: json.audit as NavAuditRow[] };
    },
    enabled: !!id,
  });
}

export function useSpaRoutes() {
  return useQuery({
    queryKey: ["nav-spa-routes"],
    queryFn: async () => {
      const json = await authFetch(`/spa-routes`);
      return json.routes as SpaRoute[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useNavCoverage(
  tenantId: string | null | undefined,
  platform: NavPlatform = "mobile",
  role: NavRole = "community",
) {
  return useQuery({
    queryKey: ["nav-coverage", tenantId || "all", platform, role],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("platform", platform);
      qs.set("role", role);
      if (tenantId) qs.set("tenant_id", tenantId);
      const json = await authFetch(`/coverage?${qs.toString()}`);
      return json as { ok: boolean } & CoverageReport;
    },
  });
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

// ── Mutations ───────────────────────────────────────────────────────────────

export function useSimulateNavigator() {
  return useMutation({
    mutationFn: async (input: SimulateInput) => {
      const json = await authFetch(`/simulate`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return json.result as SimulateResult;
    },
  });
}

export function useCreateCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<NavCatalogRow> & { i18n: Record<string, Partial<NavCatalogI18nRow>> }) => {
      const json = await authFetch(`/catalog`, { method: "POST", body: JSON.stringify(body) });
      return json.data as NavCatalogRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-catalog"] });
      qc.invalidateQueries({ queryKey: ["nav-coverage"] });
    },
  });
}

export function useUpdateCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NavCatalogRow> & { i18n?: Record<string, Partial<NavCatalogI18nRow>> } }) => {
      const json = await authFetch(`/catalog/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      return json.data as NavCatalogRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["nav-catalog"] });
      qc.invalidateQueries({ queryKey: ["nav-catalog", "entry", vars.id] });
      qc.invalidateQueries({ queryKey: ["nav-coverage"] });
    },
  });
}

export function useDeleteCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/catalog/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-catalog"] });
      qc.invalidateQueries({ queryKey: ["nav-coverage"] });
    },
  });
}

export function useRestoreCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, auditId }: { id: string; auditId: string }) => {
      const json = await authFetch(`/catalog/${id}/restore/${auditId}`, { method: "POST" });
      return json.data as NavCatalogRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["nav-catalog"] });
      qc.invalidateQueries({ queryKey: ["nav-catalog", "entry", vars.id] });
    },
  });
}
