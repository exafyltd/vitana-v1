/**
 * VTID-04504 (Community Autopilot CA-4): the draft preview sheet. It must
 * show Vitana's draft, let the member change it, and hand back exactly the
 * text they approved — never act on its own.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AutopilotDraftSheet } from "./AutopilotDraftSheet";

vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k }));

const item = { id: "rec-1", title: "Share your streak", kind: "post_to_feed" };

describe("AutopilotDraftSheet", () => {
  it("shows the draft, and confirm returns the member's edited text", async () => {
    const loadDraft = vi.fn(async () => ({ ok: true, draft: "Sieben Tage am Stück!" }));
    const onConfirm = vi.fn();
    render(<AutopilotDraftSheet item={item} loadDraft={loadDraft} onConfirm={onConfirm} onSkip={vi.fn()} />);

    const box = await screen.findByTestId("autopilot-draft-text");
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe("Sieben Tage am Stück!"));
    fireEvent.change(box, { target: { value: "Eine ganze Woche!" } });
    fireEvent.click(screen.getByTestId("autopilot-draft-confirm"));

    expect(onConfirm).toHaveBeenCalledWith("rec-1", "Eine ganze Woche!");
    expect(loadDraft).toHaveBeenCalledWith("rec-1", { regenerate: false });
  });

  it("a post cannot be confirmed empty; skip hands control back", async () => {
    const onConfirm = vi.fn();
    const onSkip = vi.fn();
    render(<AutopilotDraftSheet item={item} loadDraft={async () => null} onConfirm={onConfirm} onSkip={onSkip} />);
    await screen.findByText("autopilot.draft.failed");
    expect(screen.getByTestId("autopilot-draft-confirm")).toBeDisabled();
    fireEvent.click(screen.getByText("autopilot.draft.skip"));
    expect(onSkip).toHaveBeenCalledWith("rec-1");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("regenerate asks for a fresh draft", async () => {
    const loadDraft = vi.fn(async () => ({ ok: true, draft: "x" }));
    render(<AutopilotDraftSheet item={item} loadDraft={loadDraft} onConfirm={vi.fn()} onSkip={vi.fn()} />);
    await screen.findByTestId("autopilot-draft-text");
    fireEvent.click(screen.getByText("autopilot.draft.regenerate"));
    await waitFor(() => expect(loadDraft).toHaveBeenLastCalledWith("rec-1", { regenerate: true }));
  });
});
