/**
 * desktop-spotlight-finish / colours-backoffice — DraftCommandDialog carries only
 * semantic status tokens. The "done" surface used to be
 * `border-emerald-500/30 bg-emerald-500/5` and the "queued" surface
 * `border-amber-500/30 bg-amber-500/5`; decision 1 maps them to the nearest
 * existing tokens (status-success / status-warning). These render tests assert
 * the mapping holds and no raw emerald/amber class leaks back in.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const draftState: Record<string, unknown> = { phase: "done" };
vi.mock("@/hooks/useDraftCommand", () => ({
  useDraftCommand: () => ({
    phase: draftState.phase,
    outcome: null,
    approvalId: draftState.approvalId ?? null,
    reason: null,
    errorKey: null,
    key: "idem-key",
    review: vi.fn(),
    submit: vi.fn(),
    back: vi.fn(),
    reset: vi.fn(),
  }),
}));

import { DraftCommandDialog } from "@/components/backoffice/DraftCommandDialog";

function rawPaletteClass(el: HTMLElement): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter((cls) =>
    /(^|:)(bg|text|border|from|via|to)-(emerald|amber|green|yellow|orange|red|blue|slate|gray|purple|pink)-\d/.test(cls),
  );
}

const renderDialog = () =>
  render(
    <MemoryRouter>
      <DraftCommandDialog formId="lead" open onOpenChange={() => {}} />
    </MemoryRouter>,
  );

describe("colours-backoffice › DraftCommandDialog", () => {
  beforeEach(() => cleanup());

  it("maps the done surface to status-success with no raw palette class", () => {
    draftState.phase = "done";
    renderDialog();
    const done = document.body.querySelector('[data-testid="draft-done"] [role="status"]') as HTMLElement | null;
    expect(done).not.toBeNull();
    expect(done!.className).toContain("border-status-success/30");
    expect(done!.className).toContain("bg-status-success/5");
    expect(rawPaletteClass(done!)).toEqual([]);
  });

  it("maps the queued surface to status-warning with no raw palette class", () => {
    draftState.phase = "queued";
    draftState.approvalId = "ap-9";
    renderDialog();
    const queued = document.body.querySelector('[data-testid="draft-queued"] [role="status"]') as HTMLElement | null;
    expect(queued).not.toBeNull();
    expect(queued!.className).toContain("border-status-warning/30");
    expect(queued!.className).toContain("bg-status-warning/5");
    expect(rawPaletteClass(queued!)).toEqual([]);
  });
});
