/**
 * desktop-spotlight-finish / colours-backoffice — ApprovalDecisionDialog carries
 * only semantic status tokens. The "executed" outcome surface used to be
 * `border-emerald-500/30 bg-emerald-500/5`; decision 1 maps it to the nearest
 * existing token (status-success). This render test asserts the mapping holds
 * and no raw emerald/amber class leaks back in.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useBackOfficeCommands", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useBackOfficeCommands")>()),
  useBackOfficeCommand: () => ({ data: null, isLoading: false }),
}));
vi.mock("@/hooks/useBackOfficeDecisions", () => ({
  useApprovalDecision: () => ({ phase: "done", result: null, outcome: { kind: "executed" }, submit: vi.fn() }),
}));

import { ApprovalDecisionDialog } from "@/components/backoffice/ApprovalDecisionDialog";
import type { BackOfficeApproval } from "@/hooks/useBackOfficeCommands";

const approval = {
  id: "ap-1",
  command_id: "cmd-1",
  tenant_id: "t-1",
  requester_id: "u-1",
  approve_capability: "approvals.decide",
  status: "pending",
  reason: null,
  decided_by: null,
  decided_at: null,
  decision_note: null,
  created_at: "2026-10-16T00:00:00.000Z",
  can_decide: true,
  command: null,
} as unknown as BackOfficeApproval;

function rawPaletteClass(el: HTMLElement): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter((cls) =>
    /(^|:)(bg|text|border|from|via|to)-(emerald|amber|green|yellow|orange|red|blue|slate|gray|purple|pink)-\d/.test(cls),
  );
}

describe("colours-backoffice › ApprovalDecisionDialog", () => {
  it("shows the executed outcome with a status-success token and no raw palette class", () => {
    render(<ApprovalDecisionDialog approval={approval} verdict="approve" open onOpenChange={() => {}} />);
    const outcome = document.body.querySelector('[data-testid="decide-outcome-executed"]') as HTMLElement | null;
    expect(outcome).not.toBeNull();
    const surface = outcome!.querySelector('[role="status"]') as HTMLElement | null;
    expect(surface).not.toBeNull();
    expect(surface!.className).toContain("border-status-success/30");
    expect(surface!.className).toContain("bg-status-success/5");
    // the mapped surface itself carries no raw palette class (this lane owns it)
    expect(rawPaletteClass(surface!)).toEqual([]);
  });
});
