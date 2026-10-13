/**
 * VTID-05173 — Health Hub D4 on mobile. On a phone, Settings › Privacy › Data
 * is MobileSettings (/settings/privacy redirects to /settings?mode=privacy…).
 * No health-data consent record exists yet, so its three data-sharing switches
 * must be off and disabled (as desktop Privacy.tsx since VTID-05032), the data
 * export button disabled (no export job yet), and no hardcoded English remains
 * in the card.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n-toast";

const { passthrough, nothing } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

// Same mocks as mobile-settings-privacy-phone.vtid-05096.test.tsx.
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

const SHARING_KEYS = [
  "screens.settings.healthDataAnalytics",
  "screens.settings.communityInsights",
  "screens.settings.thirdpartyIntegrations",
];

function renderData() {
  return render(
    <MemoryRouter initialEntries={["/settings?mode=privacy.data"]}>
      <MobileSettings />
    </MemoryRouter>,
  );
}

describe("MobileSettings privacy.data (VTID-05173, Health Hub D4)", () => {
  it("the three data-sharing switches are off and disabled, labelled through t()", () => {
    renderData();
    for (const key of SHARING_KEYS) {
      expect(t(key), `${key} resolves in the catalogue`).not.toBe(key);
      const sw = screen.getByRole("switch", { name: t(key) });
      expect(sw.getAttribute("aria-checked")).toBe("false");
      expect((sw as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("the AI-provider switch is untouched (still enabled, follows consent)", () => {
    renderData();
    const enabled = screen.getAllByRole("switch").filter((s) => !(s as HTMLButtonElement).disabled);
    expect(enabled).toHaveLength(1);
    expect(enabled[0].getAttribute("aria-checked")).toBe("false");
  });

  it("the data export button is disabled", () => {
    renderData();
    const btn = screen.getByRole("button", { name: t("screens.mobilesettings.requestDataExport") });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("the AI consent note comes from the catalogue", () => {
    renderData();
    expect(screen.getByText(t("screens.settings.aiFeaturesVoiceAssistantProactiveMessages"))).toBeTruthy();
  });

  it("source: the privacy.data case has no defaultChecked and no hardcoded English", () => {
    const src = readFileSync(resolve(__dirname, "../MobileSettings.tsx"), "utf8");
    const start = src.indexOf("case 'privacy.data':");
    const end = src.indexOf("case 'privacy.security':");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).not.toMatch(/defaultChecked/);
    for (const raw of [
      "Health Data Analytics",
      "Community Insights",
      "Third-party Integrations",
      "Consent granted. Toggle off to revoke.",
      "AI features disabled until consent is granted.",
    ]) {
      expect(block).not.toContain(raw);
    }
  });
});
