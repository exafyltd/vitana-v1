/**
 * VTID-05206 — the registration step carries "Introduce me to the community",
 * on by default. Only an explicit "no" is written, so this step can never opt
 * in a member who existed before the rollout; a failed write never blocks
 * finishing the step.
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

describe("OnboardingNameForm — Introduce me to the community (VTID-05206)", () => {
  it("shows the switch, on by default", () => {
    render(<OnboardingNameForm onComplete={vi.fn()} />);
    expect(screen.getByText("Introduce me to the community")).toBeTruthy();
    expect(screen.getByTestId("onb-community-intro-switch").getAttribute("aria-checked")).toBe("true");
  });

  it("leaving it on writes nothing (the new row already defaults to true)", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).not.toHaveBeenCalled();
  });

  it("switching it off saves false for the member", async () => {
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("onb-community-intro-switch"));
    expect(screen.getByTestId("onb-community-intro-switch").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(setOptIn).toHaveBeenCalledWith("new-1", false);
    expect(setOptIn).toHaveBeenCalledTimes(1);
  });

  it("a failed opt-out never blocks finishing the step", async () => {
    setOptIn.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onComplete = vi.fn();
    render(<OnboardingNameForm onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("onb-community-intro-switch"));
    fireEvent.click(screen.getByRole("button", { name: "Let's get started!" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
