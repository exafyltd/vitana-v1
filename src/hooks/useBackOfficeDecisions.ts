/**
 * VTID-03873 — approve / reject a queued request and edit the tenant policy.
 * Both go straight to the gateway (never to ERPClaw from the browser); on an
 * approval the gateway itself executes the command through the bridge. The
 * hooks keep the full response so the dialog can show the receipt, the bridge
 * failure, or the orchestrator's refusal reason instead of a generic error.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { BackOfficeCommand, BackOfficePolicy } from "@/hooks/useBackOfficeCommands";
import { decisionOutcomeKey, type DecisionResponse, type Verdict } from "@/lib/backoffice-approvals";

const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

async function gatewayJson<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<{ status: number; body: T }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { status: 401, body: { ok: false, error: "UNAUTHORIZED" } as unknown as T };
  const res = await fetch(`${GATEWAY_BASE}${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as T;
  return { status: res.status, body: json };
}

export type DecisionPhase = "confirm" | "submitting" | "done";

export function useApprovalDecision(approvalId: string, verdict: Verdict) {
  const qc = useQueryClient();
  const { activeTenantId } = useTenant();
  const [phase, setPhase] = useState<DecisionPhase>("confirm");
  const [result, setResult] = useState<{ status: number; body: DecisionResponse & { command?: BackOfficeCommand } } | null>(null);

  const submit = useCallback(async (note: string) => {
    setPhase("submitting");
    const r = await gatewayJson<DecisionResponse & { command?: BackOfficeCommand }>(`/api/v1/backoffice/approvals/${encodeURIComponent(approvalId)}/${verdict}`, "POST", { note: note.trim() || undefined, channel: "web" });
    setResult(r);
    setPhase("done");
    // Whatever happened, the queue, the command list and the audit trail have changed (a refusal is audited too).
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["backoffice-approvals", activeTenantId] }),
      qc.invalidateQueries({ queryKey: ["backoffice-commands", activeTenantId] }),
      qc.invalidateQueries({ queryKey: ["backoffice-command", activeTenantId] }),
      qc.invalidateQueries({ queryKey: ["backoffice-audit", activeTenantId] }),
    ]);
  }, [approvalId, verdict, qc, activeTenantId]);

  const outcome = result ? decisionOutcomeKey(verdict, result.status, result.body) : null;
  return { phase, result, outcome, submit };
}

export type PolicyEditPhase = "form" | "review" | "submitting" | "done" | "failed";

export function usePolicyEdit() {
  const qc = useQueryClient();
  const { activeTenantId } = useTenant();
  const [phase, setPhase] = useState<PolicyEditPhase>("form");
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (body: BackOfficePolicy) => {
    setPhase("submitting");
    setError(null);
    const r = await gatewayJson<{ ok: boolean; error?: string; policy?: BackOfficePolicy }>(`/api/v1/backoffice/policy`, "PUT", body);
    if (r.status === 200 && r.body.ok) {
      setPhase("done");
      await Promise.all([qc.invalidateQueries({ queryKey: ["backoffice-policy", activeTenantId] }), qc.invalidateQueries({ queryKey: ["backoffice-audit", activeTenantId] })]);
    } else {
      setError(r.body.error ?? `HTTP ${r.status}`);
      setPhase("failed");
    }
  }, [qc, activeTenantId]);

  return { phase, error, save, review: () => setPhase("review"), back: () => setPhase("form"), reset: () => { setPhase("form"); setError(null); } };
}
