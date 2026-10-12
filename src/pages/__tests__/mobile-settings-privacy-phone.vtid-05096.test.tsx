/**
 * VTID-05096 — on a phone, Settings → Privacy is MobileSettings
 * (/settings/privacy redirects to /settings?mode=privacy). Its visibility
 * section must carry the same phone number card and "findable by my number"
 * switch as the desktop Privacy page; STAGING-VERIFY found them missing.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const { passthrough, nothing } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
vi.mock("@/components/StandardHeader", () => ({ default: nothing }));
vi.mock("@/components/ui/utility-action-button", () => ({ UtilityActionButton: nothing }));
vi.mock("@/components/ui/expandable-search-button", () => ({ ExpandableSearchButton: nothing }));
vi.mock("@/components/ui/MobileModePill", () => ({ MobileModePill: nothing }));
vi.mock("@/components/settings/MobileBillingView", () => ({ MobileBillingView: nothing }));
vi.mock("@/components/mobile/MobileActionChips", () => ({ VitanaIndexChip: nothing, AutopilotChip: nothing }));
vi.mock("@/components/UniversalCalendarButton", () => ({ UniversalCalendarButton: nothing }));
vi.mock("@/components/AutopilotPopup", () => ({ AutopilotPopup: nothing }));
vi.mock("@/components/PushDiagnostics", () => ({ default: nothing }));
vi.mock("@/components/ai/AIDataConsentDialog", () => ({ AIDataConsentDialog: nothing }));
vi.mock("@/hooks/use-autopilot", () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (_k: string, d: string) => d }) }));
vi.mock("@/hooks/useNotifications", () => ({
  useNotificationPreferences: () => ({ prefs: {}, loading: false, updatePref: vi.fn() }),
}));
vi.mock("@/hooks/useNotificationCategoryPreferences", () => ({
  useNotificationCategoryPreferences: () => ({ categories: [], role: "community", roleNotifications: [], loading: false, toggleCategory: vi.fn() }),
}));
vi.mock("@/hooks/useAIConsent", () => ({
  useAIConsent: () => ({ hasConsent: false, dialogOpen: false, setDialogOpen: vi.fn(), grantConsent: vi.fn(), revokeConsent: vi.fn() }),
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "de", setLanguage: vi.fn() }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/navigation/overlay-bus", () => ({ useWindowOverlay: () => undefined }));
vi.mock("@/components/settings/PhoneNumberCard", () => ({ PhoneNumberCard: () => <div data-testid="stub-phone-number-card" /> }));
vi.mock("@/components/settings/PhoneDiscoverabilityToggle", () => ({
  PhoneDiscoverabilityToggle: () => <div data-testid="stub-phone-discoverability" />,
}));

import MobileSettings from "../MobileSettings";

describe("MobileSettings privacy (VTID-05096)", () => {
  it.each(["privacy", "privacy.visibility"])("?mode=%s shows the phone number card and the discoverability switch", (mode) => {
    render(
      <MemoryRouter initialEntries={[`/settings?mode=${mode}`]}>
        <MobileSettings />
      </MemoryRouter>,
    );
    const block = screen.getByTestId("mobile-privacy-phone");
    expect(block.querySelector('[data-testid="stub-phone-number-card"]')).toBeTruthy();
    expect(block.querySelector('[data-testid="stub-phone-discoverability"]')).toBeTruthy();
  });

  it("the other privacy sections do not carry it", () => {
    render(
      <MemoryRouter initialEntries={["/settings?mode=privacy.data"]}>
        <MobileSettings />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("mobile-privacy-phone")).toBeNull();
  });
});
