/**
 * VTID-04652 (Community Autopilot plan §4.2): "Later" in the pop-up snoozes a
 * suggestion for a day and never runs it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const snooze = vi.fn();
const executeActions = vi.fn();
const toggle = vi.fn();
const success = vi.fn();
const error = vi.fn();

vi.mock("@/lib/i18n-toast", () => ({
  t: (k: string) => k,
  lookup: (k: string) => k,
  notifySuccess: (k: string) => success(k),
  notifyError: (k: string) => error(k),
}));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useAIConsent", () => ({
  useAIConsent: () => ({ hasConsent: true, dialogOpen: false, setDialogOpen: vi.fn(), grantConsent: vi.fn() }),
}));
vi.mock("@/components/health/VitanaIndexProvider", () => ({ useVitanaIndexCache: () => ({ index: null }) }));

const action = {
  id: "rec-1", title: "Log a glass of water", reason: "Hydration is your lowest pillar", category: "health",
  priority: "medium", icon: "💧", timestamp: new Date(), status: "pending", selected: false,
};

vi.mock("@/hooks/use-autopilot", () => ({
  useAutopilot: () => ({
    allVisibleActions: [action],
    pendingActions: [action],
    selectedActions: [],
    executeActions,
    toggleActionSelection: toggle,
    isExecuting: false,
    loading: false,
    error: null,
    fetchRecommendations: vi.fn(),
    completeRecommendation: vi.fn(),
    setActionStatus: vi.fn(),
    markDismissedLocally: vi.fn(),
    snoozeRecommendation: (...a: unknown[]) => snooze(...a),
    fetchDraft: vi.fn(),
    generateRecommendations: vi.fn(),
    generating: false,
    generateReason: null,
    fetchedOnce: true,
  }),
}));

import { AutopilotPopup } from "./AutopilotPopup";

const mount = () =>
  render(<MemoryRouter><AutopilotPopup open onOpenChange={vi.fn()} /></MemoryRouter>);

describe("AutopilotPopup — Later", () => {
  beforeEach(() => { snooze.mockReset(); success.mockReset(); error.mockReset(); toggle.mockReset(); executeActions.mockReset(); });

  it("snoozes the suggestion for 24 hours without selecting or running it", async () => {
    snooze.mockResolvedValue(true);
    mount();
    fireEvent.click(await screen.findByTestId("autopilot-snooze-rec-1"));
    await waitFor(() => expect(snooze).toHaveBeenCalledWith("rec-1", 24));
    expect(success).toHaveBeenCalledWith("screens.autopilotpopup.snoozedUntilTomorrow");
    expect(toggle).not.toHaveBeenCalled();
    expect(executeActions).not.toHaveBeenCalled();
  });

  it("tells the member when the snooze did not go through", async () => {
    snooze.mockResolvedValue(false);
    mount();
    fireEvent.click(await screen.findByTestId("autopilot-snooze-rec-1"));
    await waitFor(() => expect(error).toHaveBeenCalledWith("screens.autopilotpopup.snoozeFailed"));
  });
});
