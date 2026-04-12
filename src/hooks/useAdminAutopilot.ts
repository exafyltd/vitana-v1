/**
 * VTID-AP-ADMIN: React Query hooks for the Autopilot admin section.
 *
 * Calls /api/v1/admin/autopilot/* — tenant-scoped via requireTenantAdmin.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";

// ── Types ─────────────────────────────────────────────────────

export interface AutopilotSettings {
  id: string;
  tenant_id: string;
  enabled: boolean;
  max_recommendations_per_day: number;
  max_activations_per_day: number;
  allowed_domains: string[];
  allowed_risk_levels: string[];
  auto_activate_threshold: number | null;
  recommendation_retention_days: number;
  generation_schedule: { cron: string; timezone: string };
  updated_at: string;
  updated_by: string | null;
}

export interface AutopilotBinding {
  id: string;
  tenant_id: string;
  automation_id: string;
  enabled: boolean;
  schedule: Record<string, unknown> | null;
  guardrails: Record<string, unknown> | null;
  role_allowances: string[];
  requires_approval: boolean;
  max_runs_per_day: number | null;
  max_runs_per_user_per_day: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface AutomationCatalogEntry {
  id: string;
  name: string;
  domain: string;
  status: "PLANNED" | "IN_PROGRESS" | "IMPLEMENTED" | "LIVE" | "DEPRECATED";
  priority: string;
  trigger_type: "cron" | "event" | "heartbeat" | "manual" | "webhook";
  trigger_config: { cronExpression?: string; eventTopic?: string; intervalMinutes?: number } | null;
  target_roles: "all" | string[];
  has_handler: boolean;
  requires: string[];
  binding: AutopilotBinding | null;
  enabled: boolean;
}

export interface AutopilotRun {
  id: string;
  tenant_id: string;
  binding_id: string | null;
  automation_id: string;
  triggered_by: string | null;
  trigger_type: string;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  activated_vtid: string | null;
}

export interface RunsStats {
  period_days: number;
  total_runs: number;
  completed: number;
  failed: number;
  success_rate: number;
  time_saved_minutes: number;
  by_automation: Record<string, { total: number; completed: number; failed: number; avg_duration_ms: number }>;
  daily_trend: Array<{ date: string; count: number }>;
}

export interface RecommendationRow {
  id: string;
  title: string;
  summary: string;
  domain: string;
  risk_level: string;
  impact_score: number;
  effort_score: number;
  status: "new" | "activated" | "rejected" | "snoozed";
  activated_vtid: string | null;
  snoozed_until: string | null;
  created_at: string;
  activated_at: string | null;
}

export interface RecommendationSummary {
  new: number;
  activated: number;
  rejected: number;
  snoozed: number;
  total: number;
}

// ── Settings ──────────────────────────────────────────────────

export function useAutopilotSettings() {
  return useQuery({
    queryKey: ["admin-autopilot-settings"],
    queryFn: async () => {
      const json = await adminFetch("/api/v1/admin/autopilot/settings");
      return json.data as AutopilotSettings;
    },
  });
}

export function useUpdateAutopilotSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<AutopilotSettings>) => {
      return adminFetch("/api/v1/admin/autopilot/settings", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-autopilot-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-autopilot-recommendations"] });
    },
  });
}

// ── Catalog + Bindings (Automations tab) ─────────────────────

export function useAutomationCatalog() {
  return useQuery({
    queryKey: ["admin-autopilot-catalog"],
    queryFn: async () => {
      const json = await adminFetch("/api/v1/admin/autopilot/catalog");
      return json.data as AutomationCatalogEntry[];
    },
  });
}

export function useAutopilotBindings(params: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-autopilot-bindings", params],
    queryFn: async () => {
      const qs = params.enabled !== undefined ? `?enabled=${params.enabled}` : "";
      const json = await adminFetch(`/api/v1/admin/autopilot/bindings${qs}`);
      return json.data as AutopilotBinding[];
    },
  });
}

export function useUpsertBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      automation_id: string;
      enabled?: boolean;
      schedule?: Record<string, unknown>;
      guardrails?: Record<string, unknown>;
      role_allowances?: string[];
      requires_approval?: boolean;
      max_runs_per_day?: number;
      max_runs_per_user_per_day?: number;
    }) => {
      return adminFetch("/api/v1/admin/autopilot/bindings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-autopilot-catalog"] });
      qc.invalidateQueries({ queryKey: ["admin-autopilot-bindings"] });
    },
  });
}

export function useUpdateBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bindingId, ...updates }: { bindingId: string } & Partial<AutopilotBinding>) => {
      return adminFetch(`/api/v1/admin/autopilot/bindings/${bindingId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-autopilot-catalog"] });
      qc.invalidateQueries({ queryKey: ["admin-autopilot-bindings"] });
    },
  });
}

export function useDeleteBinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bindingId: string) => {
      return adminFetch(`/api/v1/admin/autopilot/bindings/${bindingId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-autopilot-catalog"] });
      qc.invalidateQueries({ queryKey: ["admin-autopilot-bindings"] });
    },
  });
}

// ── Runs (execution history) ─────────────────────────────────

export function useAutopilotRuns(params: { status?: string; automation_id?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["admin-autopilot-runs", params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.automation_id) qs.set("automation_id", params.automation_id);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      const json = await adminFetch(`/api/v1/admin/autopilot/runs${q ? `?${q}` : ""}`);
      return { runs: json.data as AutopilotRun[], total: json.total as number };
    },
  });
}

export function useRunsStats(days: number = 30) {
  return useQuery({
    queryKey: ["admin-autopilot-runs-stats", days],
    queryFn: async () => {
      const json = await adminFetch(`/api/v1/admin/autopilot/runs/stats?days=${days}`);
      return json.data as RunsStats;
    },
  });
}

// ── Recommendations (tenant-filtered) ────────────────────────

export function useAutopilotRecommendations(params: { status?: string; domain?: string; risk_level?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["admin-autopilot-recommendations", params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.domain) qs.set("domain", params.domain);
      if (params.risk_level) qs.set("risk_level", params.risk_level);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      const json = await adminFetch(`/api/v1/admin/autopilot/recommendations${q ? `?${q}` : ""}`);
      return { recommendations: json.data as RecommendationRow[], total: json.total as number, autopilot_enabled: json.autopilot_enabled as boolean };
    },
  });
}

export function useRecommendationsSummary() {
  return useQuery({
    queryKey: ["admin-autopilot-recommendations-summary"],
    queryFn: async () => {
      const json = await adminFetch("/api/v1/admin/autopilot/recommendations/summary");
      return json.data as RecommendationSummary;
    },
  });
}
