/**
 * VTID-05206 — desktop Settings → Privacy › Profile visibility carries the
 * "Introduce me to the community" switch, in both the Spotlight and the legacy
 * screen (the phone screen is MobileSettings, covered by
 * src/pages/__tests__/mobile-settings-privacy-phone.vtid-05096.test.tsx).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const { passthrough, nothing, spotlight } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
  spotlight: { on: false },
}));

vi.mock("@/hooks/useSpotlightEnabled", () => ({ useSpotlightEnabled: () => spotlight.on }));
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
vi.mock("@/components/settings/PhoneNumberCard", () => ({ PhoneNumberCard: nothing }));
vi.mock("@/components/settings/PhoneDiscoverabilityToggle", () => ({ PhoneDiscoverabilityToggle: nothing }));
vi.mock("@/components/settings/CommunityIntroToggle", () => ({
  CommunityIntroToggle: () => <div data-testid="stub-community-intro" />,
}));
vi.mock("@/hooks/useAIConsent", () => ({
  useAIConsent: () => ({ hasConsent: false, dialogOpen: false, setDialogOpen: vi.fn(), grantConsent: vi.fn(), revokeConsent: vi.fn() }),
}));

import Privacy from "../Privacy";

describe("Privacy › Profile visibility — community intro switch (VTID-05206)", () => {
  beforeEach(() => { spotlight.on = false; });

  it.each([false, true])("is mounted on the profile section (Spotlight %s)", (on) => {
    spotlight.on = on;
    render(
      <MemoryRouter initialEntries={["/settings/privacy?section=profile"]}>
        <Privacy />
      </MemoryRouter>,
    );
    expect(screen.getAllByTestId("stub-community-intro").length).toBeGreaterThanOrEqual(1);
  });
});
