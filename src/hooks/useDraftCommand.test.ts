/**
 * VTID-03888 — the tier rules of the review card, kept pure so they are testable
 * without React: what a gateway answer means for the card.
 */
import { describe, expect, it } from "vitest";
import { draftPhaseFor } from "./useDraftCommand";
import type { CommandResponse } from "./useBackOfficeCommands";

const cmd = (status: CommandResponse["command"] extends infer C ? (C extends { status: infer S } ? S : never) : never, extra: Record<string, unknown> = {}) =>
  ({ command_id: "c1", type: "x", action: "y", tier: "commit", status, reason: null, approval_id: null, receipt: null, escalations: [], channel: "web", requester_id: "u", created_at: "t", executed_at: null, ...extra }) as unknown as NonNullable<CommandResponse["command"]>;

describe("draftPhaseFor", () => {
  it("an executed command is done", () => {
    expect(draftPhaseFor(200, { ok: true, command: cmd("executed") })).toBe("done");
  });
  it("a High-risk command answers 202 awaiting_approval — queued, never done, never failed", () => {
    expect(draftPhaseFor(202, { ok: true, command: cmd("awaiting_approval", { tier: "high", approval_id: "ap-1" }), approval: { approval_id: "ap-1", approve_capability: "finance.approve" } })).toBe("queued");
    // even if a proxy rewrote the status code, the command status still decides
    expect(draftPhaseFor(200, { ok: true, command: cmd("awaiting_approval") })).toBe("queued");
  });
  it("rejected (e.g. confirmation_required, missing_capability) and failed answers are failed", () => {
    expect(draftPhaseFor(403, { ok: false, command: cmd("rejected", { reason: "confirmation_required" }) })).toBe("failed");
    expect(draftPhaseFor(502, { ok: false, error: "erp_action_failed", command: cmd("failed") })).toBe("failed");
    expect(draftPhaseFor(503, { ok: false, error: "bridge_not_configured" })).toBe("failed");
  });
});
