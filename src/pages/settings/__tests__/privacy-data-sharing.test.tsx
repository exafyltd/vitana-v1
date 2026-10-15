/**
 * VTID-05032 (Health Hub D4): Privacy › Data Sharing never shows health-data
 * sharing as on. No consent record or export job exists yet, so the three
 * data-sharing switches are off and disabled and "Request data export" is
 * disabled.
 *
 * VTID-05093 (Health Hub D10): the two category switches are now bound to real
 * consent records and "Third-party integrations" became the per-partner
 * "Manage connected sources" row. When the consents cannot be loaded the
 * switches still render unchecked and disabled — the VTID-05032 guarantee.
 * The full consent behaviour is in privacy-health-consents.vtid-05093.test.tsx.
 */
import { describe, it, expect, vi } from "vitest";
// VTID-05117: the page now reads the Spotlight flag; this suite covers the legacy (flag-off) screen.
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n-toast";

const { passthrough, nothing } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
// The consent store answers with an error: nothing may read as granted.
vi.mock("@/lib/admin-api", () => ({ adminFetch: vi.fn().mockRejectedValue(new Error("CONSENTS_UNAVAILABLE")) }));
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
  it("renders the data-sharing switches unchecked and disabled, and the export button disabled", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/settings/privacy?section=data"]}>
          <Privacy />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    for (const key of [
      "screens.settings.healthDataAnalytics",
      "screens.settings.communityInsights",
    ]) {
      const sw = screen.getByRole("switch", { name: t(key) });
      expect(sw, key).toHaveAttribute("aria-checked", "false");
      expect(sw, key).toBeDisabled();
    }

    expect(screen.getByTestId("health-consent-manage-sources")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("screens.settings.requestDataExport") })).toBeDisabled();
  });
});
