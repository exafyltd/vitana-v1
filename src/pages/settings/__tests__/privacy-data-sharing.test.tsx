/**
 * VTID-05032 (Health Hub D4): Privacy › Data Sharing never shows health-data
 * sharing as on. No consent record or export job exists yet, so the three
 * data-sharing switches are off and disabled and "Request data export" is
 * disabled.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n-toast";

const { passthrough, nothing } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
vi.mock("@/components/SEO", () => ({ default: nothing }));
vi.mock("@/components/SubNavigation", () => ({ default: nothing }));
vi.mock("@/components/StandardHeader", () => ({ default: nothing }));
vi.mock("@/components/ui/utility-action-button", () => ({ UtilityActionButton: nothing }));
vi.mock("@/components/ui/expandable-search-button", () => ({ ExpandableSearchButton: nothing }));
vi.mock("@/components/UniversalCalendarButton", () => ({ UniversalCalendarButton: nothing }));
vi.mock("@/components/MotivationalBanner", () => ({ MotivationalBanner: nothing }));
vi.mock("@/components/PrivacyAuditPopup", () => ({ PrivacyAuditPopup: nothing }));
vi.mock("@/components/ai/AIDataConsentDialog", () => ({ AIDataConsentDialog: nothing }));
vi.mock("@/components/settings/SpotlightConsentToggle", () => ({ SpotlightConsentToggle: nothing }));
vi.mock("@/hooks/useAIConsent", () => ({
  useAIConsent: () => ({
    hasConsent: false,
    dialogOpen: false,
    setDialogOpen: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
  }),
}));

import Privacy from "../Privacy";

describe("Privacy data sharing (VTID-05032)", () => {
  it("renders the three data-sharing switches unchecked and disabled, and the export button disabled", () => {
    render(
      <MemoryRouter initialEntries={["/settings/privacy?section=data"]}>
        <Privacy />
      </MemoryRouter>,
    );

    for (const key of [
      "screens.settings.healthDataAnalytics",
      "screens.settings.communityInsights",
      "screens.settings.thirdpartyIntegrations",
    ]) {
      const sw = screen.getByRole("switch", { name: t(key) });
      expect(sw, key).toHaveAttribute("aria-checked", "false");
      expect(sw, key).toBeDisabled();
    }

    expect(screen.getByRole("button", { name: t("screens.settings.requestDataExport") })).toBeDisabled();
  });
});
