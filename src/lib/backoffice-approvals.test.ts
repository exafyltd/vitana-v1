import { describe, expect, it } from "vitest";
import { decisionOutcomeKey, policyChanges, validateDecisionNote, validatePolicyEdit } from "./backoffice-approvals";

describe("decisionOutcomeKey", () => {
  it("maps the orchestrator's refusal reasons, an execution failure after approval, and success", () => {
    expect(decisionOutcomeKey("approve", 200, { ok: true })).toEqual({ kind: "executed", key: "executed" });
    expect(decisionOutcomeKey("reject", 200, { ok: true, command: { status: "rejected" } })).toEqual({ kind: "rejected", key: "rejected" });
    expect(decisionOutcomeKey("reject", 403, { ok: false, error: "self_approval_forbidden" })).toEqual({ kind: "refused", key: "selfApproval" });
    expect(decisionOutcomeKey("approve", 403, { ok: false, error: "self_approval_forbidden" })).toEqual({ kind: "refused", key: "selfApproval" });
    expect(decisionOutcomeKey("approve", 403, { ok: false, error: "mfa_required" })).toEqual({ kind: "refused", key: "mfaRequired" });
    expect(decisionOutcomeKey("approve", 409, { ok: false, error: "ALREADY_DECIDED", status: "approved" })).toEqual({ kind: "refused", key: "alreadyDecided" });
    expect(decisionOutcomeKey("approve", 502, { ok: false, command: {} })).toEqual({ kind: "executedButFailed", key: "erpFailed" });
    expect(decisionOutcomeKey("approve", 502, { ok: false, command: { status: "failed", reason: "bridge_not_configured" } })).toEqual({ kind: "executedButFailed", key: "bridgeUnavailable" });
    expect(decisionOutcomeKey("approve", 503, { ok: false, error: "bridge_not_configured" })).toEqual({ kind: "executedButFailed", key: "bridgeUnavailable" });
    expect(decisionOutcomeKey("approve", 500, { ok: false, error: "INTERNAL_ERROR" })).toEqual({ kind: "error", key: "generic" });
  });
});

describe("validateDecisionNote", () => {
  it("requires a note to reject, never to approve, and caps at 1000 chars", () => {
    expect(validateDecisionNote("reject", "  ")).toBe("required");
    expect(validateDecisionNote("approve", "")).toBeNull();
    expect(validateDecisionNote("reject", "Amount does not match the signed order")).toBeNull();
    expect(validateDecisionNote("approve", "x".repeat(1001))).toBe("tooLong");
  });
});

describe("policy edit", () => {
  it("validates the threshold like the route's PolicyBody and rounds to whole AED", () => {
    expect(validatePolicyEdit("", true).issues).toEqual({ threshold: "invalidThreshold" });
    expect(validatePolicyEdit("-1", true).issues).toEqual({ threshold: "invalidThreshold" });
    expect(validatePolicyEdit("abc", true).issues).toEqual({ threshold: "invalidThreshold" });
    expect(validatePolicyEdit("25000.4", false).body).toEqual({ high_risk_amount_threshold: 25000, require_mfa_for_high: false });
  });
  it("lists only the fields that change", () => {
    const before = { high_risk_amount_threshold: 25000, require_mfa_for_high: true };
    expect(policyChanges(before, { ...before })).toEqual([]);
    expect(policyChanges(before, { high_risk_amount_threshold: 50000, require_mfa_for_high: true })).toEqual(["high_risk_amount_threshold"]);
    expect(policyChanges(before, { high_risk_amount_threshold: 25000, require_mfa_for_high: false })).toEqual(["require_mfa_for_high"]);
  });
});
