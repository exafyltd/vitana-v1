/**
 * VTID-03873 — the maker-checker half of the BackOffice command flow: decide a
 * queued High-risk request (POST /approvals/:id/approve|reject) and edit the
 * tenant policy (PUT /policy). Pure helpers here; the hooks live in
 * useBackOfficeDecisions.ts.
 */
import type { BackOfficePolicy } from "@/hooks/useBackOfficeCommands";

export type Verdict = "approve" | "reject";

/** Orchestrator refusal reasons (command-policy.ts evaluateApproval) plus route-level errors, mapped to i18n keys under screens.backoffice.decide.refusals.*. */
export const REFUSAL_KEYS: Record<string, string> = {
  self_approval_forbidden: "selfApproval",
  approval_requires_approvals_screen: "webOnly",
  no_approve_capability_on_request: "noCapabilityOnRequest",
  approver_capability_missing: "capabilityMissing",
  platform_role_read_only: "readOnlyRole",
  mfa_required: "mfaRequired",
  ALREADY_DECIDED: "alreadyDecided",
  NOT_FOUND: "notFound",
  COMMAND_NOT_FOUND: "notFound",
  FORBIDDEN: "capabilityMissing",
};

export interface DecisionResponse { ok: boolean; error?: string; status?: string; command?: { reason?: string | null } | unknown }

/** The machine reason behind a non-success answer: a top-level `error`, else the failed command's `reason` (a 502 carries it there). */
export function decisionReason(body: DecisionResponse | null): string {
  const cmd = body?.command as { reason?: string | null } | undefined;
  return body?.error ?? cmd?.reason ?? "";
}

/** What to tell the approver when the decision did not go through. `executedButFailed` = approved, but ERPClaw/bridge failed on execution. */
export function decisionOutcomeKey(verdict: Verdict, status: number, body: DecisionResponse | null): { kind: "executed" | "rejected" | "refused" | "executedButFailed" | "error"; key: string } {
  // A 200 on a rejection means "recorded, nothing ran" — never an execution, whatever the body says.
  if (status === 200 && body?.ok) return verdict === "reject" ? { kind: "rejected", key: "rejected" } : { kind: "executed", key: "executed" };
  const reason = decisionReason(body);
  if (status === 502 || reason === "erp_action_failed" || reason === "bridge_not_configured") return { kind: "executedButFailed", key: reason === "bridge_not_configured" ? "bridgeUnavailable" : "erpFailed" };
  if (REFUSAL_KEYS[reason]) return { kind: "refused", key: REFUSAL_KEYS[reason] };
  if (status === 401) return { kind: "error", key: "unauthorized" };
  return { kind: "error", key: "generic" };
}

/** A rejection must say why; an approval may. Trimmed, capped at the route's 1000 chars. */
export function validateDecisionNote(verdict: Verdict, note: string): "required" | "tooLong" | null {
  const n = note.trim();
  if (verdict === "reject" && !n) return "required";
  if (n.length > 1000) return "tooLong";
  return null;
}

export type PolicyIssue = "invalidThreshold";

/** Mirrors PolicyBody on the route: threshold 0 … 1e12 as a number, MFA a boolean. */
export function validatePolicyEdit(thresholdText: string, mfa: boolean): { issues: Partial<Record<"threshold", PolicyIssue>>; body: BackOfficePolicy | null } {
  const n = Number(thresholdText.trim());
  if (thresholdText.trim() === "" || !Number.isFinite(n) || n < 0 || n > 1e12) return { issues: { threshold: "invalidThreshold" }, body: null };
  return { issues: {}, body: { high_risk_amount_threshold: Math.round(n), require_mfa_for_high: mfa } };
}

/** Which fields a policy edit actually changes — the review step shows only those, and an unchanged policy is not saved. */
export function policyChanges(before: BackOfficePolicy, after: BackOfficePolicy): Array<keyof BackOfficePolicy> {
  const out: Array<keyof BackOfficePolicy> = [];
  if (before.high_risk_amount_threshold !== after.high_risk_amount_threshold) out.push("high_risk_amount_threshold");
  if (before.require_mfa_for_high !== after.require_mfa_for_high) out.push("require_mfa_for_high");
  return out;
}
