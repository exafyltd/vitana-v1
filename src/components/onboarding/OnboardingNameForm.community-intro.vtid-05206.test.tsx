/**
 * VTID-05475 — the registration step carries "May we introduce you to the
 * community?" as an explicit choice: two options, NEITHER pre-selected
 * ("Yes, introduce me 👋" / "Not now"). Choosing Yes records opt-in true +
 * marker; choosing Not now records false + marker; submitting WITHOUT choosing
 * records nothing and still completes registration. A failed write never blocks
 * finishing the step.
 *
 * (Contract change from VTID-05206, which had a single switch on by default that
 * wrote only an explicit "no". The owner decision 2026-10-30 replaced the
 * default-ON switch with an explicit, unselected choice.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const done = { data: null, error: null };
type Settle = (v: unknown) => unknown;
type Builder = Record<string, (...a: never[]) => unknown>;
function builder() {
  const b: Builder = {
    select: () => b, eq: () => b, update: () => b, upsert: () => b,
    maybeSingle: () => Promise.resolve(done),
    then: (res: Settle, rej: Settle) => Promise.resolve(done).then(res, rej),
  };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => builder() } }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "new-1", user_metadata: { full_name: "Anna Neu" } } }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (_k: string, d: string) => d }) }));
vi.mock("@/hooks/useOnboardingStatus", () => ({ markOnboardingComplete: vi.fn() }));
const setOptIn = vi.fn();
vi.mock("@/lib/community-intro", () => ({ setCommunityIntroOptIn: (...a: unknown[]) => setOptIn(...a) }));

import { OnboardingNameForm } from "./OnboardingNameForm";

beforeEach(() => {
  setOptIn.mockReset();
  setOptIn.mockResolvedValue(undefined);
});

describe("OnboardingNameForm — community introductions are an explicit choice (VTID-05475)", () => {
  it("shows a radiogroup with two options, NEITHER pre-selected", () => {
    render(<OnboardingNameForm onComplete={vi.fn()} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toBeTruthy();
    const yes = screen.getByTestId("onb-community-intro-yes");
    const no = screen.getByTestId("onb-community-intro-no");
    expect(yes.getAttribute("role")).toBe("radio");
    expect(no.getAttribute("role")).toBe("radio");
    expect(yes.getAttribute("aria-checked")).toBe("false");
    expect(no.getAttribute("aria-checked")).toBe("false");
    // The Yes option keeps the emoji.
    expect(yes.textContent).toContain("👋");
  });

  it("is a single tab stop: with nothing selected the first option is tabbable and the second is not (roving tabindex)", () => {
    render(<OnboardingNameForm onComplete={vi.fn()} />);
    const yes = screen.getByTestId("onb-community-intro-yes");
    const no = screen.getByTestId("onb-community-intro-no");
    // Exactly one option is in the tab order so the whole group is a single tab stop.
    expect(yes.getAttribute("tabindex")).toBe("0");
    expect(no.getAttribute("tabindex")).toBe("-1");
  });

  it("after selecting, only the selected option is tabbable (roving tabindex moves with selection)", () => {
    render(<OnboardingNameForm onComplete={vi.fn()} />);
    const yes = screen.getByTestId("onb-community-intro-yes");
    const no = screen.getByTestId("onb-community-intro-no");
    fireEvent.click(no);
    expect(no.getAttribute("tabindex")).toBe("0");
    expect(yes.getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowDown both moves focus and SELECTS the next option, wrapping around, and records the choice", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    const yes = screen.getByTestId("onb-community-intro-yes");
    const no = screen.getByTestId("onb-community-intro-no");
    // ArrowDown from the first option selects the second (standard radiogroup: move + select).
    fireEvent.keyDown(yes, { key: "ArrowDown" });
    expect(no.getAttribute("aria-checked")).toBe("true");
    expect(yes.getAttribute("aria-checked")).toBe("false");
    // Wrap around: ArrowDown from the last option selects the first.
    fireEvent.keyDown(no, { key: "ArrowDown" });
    expect(yes.getAttribute("aria-checked")).toBe("true");
    expect(no.getAttribute("aria-checked")).toBe("false");
    // The keyboard-made choice records exactly like a click (same handler/path).
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).toHaveBeenCalledWith("new-1", true);
    expect(setOptIn).toHaveBeenCalledTimes(1);
  });

  it("ArrowUp/ArrowLeft and ArrowRight move+select, and Space/Enter selects the focused option", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    const yes = screen.getByTestId("onb-community-intro-yes");
    const no = screen.getByTestId("onb-community-intro-no");
    // ArrowRight behaves like ArrowDown (next + select).
    fireEvent.keyDown(yes, { key: "ArrowRight" });
    expect(no.getAttribute("aria-checked")).toBe("true");
    // ArrowLeft behaves like ArrowUp (previous + select), wrapping to the first here.
    fireEvent.keyDown(no, { key: "ArrowLeft" });
    expect(yes.getAttribute("aria-checked")).toBe("true");
    // Space selects the focused option.
    fireEvent.keyDown(no, { key: " " });
    expect(no.getAttribute("aria-checked")).toBe("true");
    // Enter selects the focused option.
    fireEvent.keyDown(yes, { key: "Enter" });
    expect(yes.getAttribute("aria-checked")).toBe("true");
    // Records "Not now" → false after the last selection is the first option... re-select "no" to assert a clean write.
    fireEvent.keyDown(yes, { key: "ArrowDown" });
    expect(no.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).toHaveBeenCalledWith("new-1", false);
    expect(setOptIn).toHaveBeenCalledTimes(1);
  });

  it("choosing Yes writes opt-in true (with marker written by the lib) and completes registration", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("onb-community-intro-yes"));
    expect(screen.getByTestId("onb-community-intro-yes").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("onb-community-intro-no").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).toHaveBeenCalledWith("new-1", true);
    expect(setOptIn).toHaveBeenCalledTimes(1);
  });

  it("choosing Not now writes opt-in false and completes registration", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("onb-community-intro-no"));
    expect(screen.getByTestId("onb-community-intro-no").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).toHaveBeenCalledWith("new-1", false);
    expect(setOptIn).toHaveBeenCalledTimes(1);
  });

  it("submitting with NO choice writes nothing and still completes registration", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    // do not click either option
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).not.toHaveBeenCalled();
  });

  it("a failed choice write never blocks finishing the step", async () => {
    setOptIn.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("onb-community-intro-yes"));
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
