/**
 * desktop-spotlight-finish / colours-backoffice — PolicyEditDialog carries only
 * semantic status tokens, never a raw palette class. The "done" surface used to
 * be `border-emerald-500/30 bg-emerald-500/5`; decision 1 maps it to the nearest
 * existing token (status-success). This render test asserts the mapping holds and
 * no raw emerald/amber class leaks back in.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useBackOfficeDecisions", () => ({
  usePolicyEdit: () => ({ phase: "done", error: null, save: vi.fn(), review: vi.fn(), back: vi.fn(), reset: vi.fn() }),
}));

import { PolicyEditDialog } from "@/components/backoffice/PolicyEditDialog";
import type { BackOfficePolicy } from "@/hooks/useBackOfficeCommands";

const policy: BackOfficePolicy = { high_risk_amount_threshold: 25000, require_mfa_for_high: true };

function rawPaletteClass(el: HTMLElement): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter((cls) =>
    /(^|:)(bg|text|border|from|via|to)-(emerald|amber|green|yellow|orange|red|blue|slate|gray|purple|pink)-\d/.test(cls),
  );
}

describe("colours-backoffice › PolicyEditDialog", () => {
  it("shows the done surface with a status-success token and no raw palette class", () => {
    render(<PolicyEditDialog current={policy} open onOpenChange={() => {}} />);
    const done = document.body.querySelector('[data-testid="policy-done"]') as HTMLElement | null;
    expect(done).not.toBeNull();
    expect(done!.className).toContain("border-status-success/30");
    expect(done!.className).toContain("bg-status-success/5");
    expect(rawPaletteClass(done!)).toEqual([]);
  });
});
