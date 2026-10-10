/**
 * VTID-05032 (Health Hub D3): Connected Apps never shows a health integration
 * as connected unless the gateway (GET /api/v1/wearables/providers) says so,
 * and the Data Sync tab shows only real connections at their real last sync.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import type { WearableProvider } from "@/hooks/useWearableProviders";
import { t } from "@/lib/i18n-toast";
import { fmtDateTime } from "@/lib/locale-format";

const { passthrough, nothing, state } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
  state: { providers: [] as WearableProvider[] },
}));

vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
vi.mock("@/components/SEO", () => ({ default: nothing }));
vi.mock("@/components/StandardHeader", () => ({ default: nothing }));
vi.mock("@/components/ui/utility-action-button", () => ({ UtilityActionButton: nothing }));
vi.mock("@/components/ui/expandable-search-button", () => ({ ExpandableSearchButton: nothing }));
vi.mock("@/components/UniversalCalendarButton", () => ({ UniversalCalendarButton: nothing }));
vi.mock("@/components/ConnectAppPopup", () => ({ ConnectAppPopup: nothing }));
vi.mock("@/components/settings/MobileConnectedAppsView", () => ({ MobileConnectedAppsView: nothing }));
vi.mock("@/components/business/vaea/VaeaChannelsPanel", () => ({ VaeaChannelsPanel: nothing }));
vi.mock("@/components/AIAssistantConnectModal", () => ({ AIAssistantConnectModal: nothing }));
vi.mock("@/components/settings/GoogleConnectionVerifyDialog", () => ({ GoogleConnectionVerifyDialog: nothing }));
vi.mock("@/components/settings/SessionExpiredBanner", () => ({ SessionExpiredBanner: nothing }));
vi.mock("@/components/settings/OAuthBouncePendingOverlay", () => ({ OAuthBouncePendingOverlay: nothing }));
vi.mock("@/components/settings/PartnerLabsConsentDialog", () => ({ PartnerLabsConsentDialog: nothing }));
vi.mock("@/components/settings/connected-apps/MailCalendarContactsPanel", () => ({ MailCalendarContactsPanel: nothing }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/RTLProvider", () => ({ useRTL: () => ({ isRTL: false }) }));
vi.mock("@/hooks/useSocialPlatforms", () => ({ useSocialPlatforms: () => ({ allPlatforms: [], loading: false }) }));
vi.mock("@/hooks/useAIAssistants", () => ({
  useAIProviders: () => ({ data: [] }),
  useDisconnectAIProvider: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useGoogleConnect", () => ({
  useStartGoogleConnect: () => ({ mutate: vi.fn() }),
  useStartYouTubeConnect: () => ({ mutate: vi.fn() }),
  useSocialConnections: () => ({ data: [], error: null }),
  GOOGLE_CONNECTOR_IDS: new Set<string>(),
  YOUTUBE_CONNECTOR_IDS: new Set<string>(),
}));

vi.mock("@/hooks/useWearableProviders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useWearableProviders")>();
  return { ...actual, useWearableProviders: () => ({ data: state.providers }) };
});

import ConnectedApps from "../ConnectedApps";

const HEALTH_CARD_IDS = [
  "health-apple-health",
  "health-fitbit",
  "health-strava",
  "health-oura",
  "health-garmin",
  "health-myfitnesspal",
  "sleep-oura",
  "sleep-eightsleep",
  "sleep-withings-sleep",
  "nutrition-myfitnesspal",
  "nutrition-cronometer",
  "nutrition-lifesum",
  "nutrition-yazio",
];

const FITBIT_SYNC = "2026-10-09T08:15:00.000Z";

const fitbitConnected: WearableProvider[] = [
  { id: "fitbit", display_name: "Fitbit", category: "wearable", status: "connected", last_sync_at: FITBIT_SYNC },
  { id: "oura", display_name: "Oura", category: "wearable", status: "available", last_sync_at: null },
  { id: "strava", display_name: "Strava", category: "wearable", status: "available", last_sync_at: null },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/connected-apps"]}>
      <ConnectedApps />
    </MemoryRouter>,
  );
}

/** The badge labels rendered next to a card's title. */
function badgesOf(cardId: string): string[] {
  const title = document.getElementById(`card-title-${cardId}`);
  if (!title) throw new Error(`card ${cardId} not rendered`);
  return Array.from(title.parentElement!.querySelectorAll("span"))
    .map((s) => s.textContent ?? "")
    .filter(Boolean);
}

function openDataSyncTab() {
  const trigger = document.querySelector('[id$="-trigger-sync"]');
  if (!trigger) throw new Error("Data Sync tab trigger not found");
  fireEvent.mouseDown(trigger, { button: 0, ctrlKey: false });
}

beforeEach(() => {
  state.providers = [];
  // jsdom has no IntersectionObserver; the card only uses it for view analytics.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("ConnectedApps health cards (VTID-05032)", () => {
  it("with no providers, no health card shows connected and Data Sync shows the not-connected text", () => {
    renderPage();
    const connected = t("screens.settings.connected");
    for (const id of HEALTH_CARD_IDS) {
      const badges = badgesOf(id);
      expect(badges, id).not.toContain(connected);
      expect(badges, id).toContain(t("screens.settings.notConnected"));
    }
    // Every health action is disabled — nothing pretends to work.
    for (const id of HEALTH_CARD_IDS) {
      const card = document.getElementById(`card-title-${id}`)!.closest(".grid")!;
      const button = card.querySelector("button");
      if (button) expect(button, id).toBeDisabled();
    }

    openDataSyncTab();
    expect(screen.getByTestId("per-app-sync-empty")).toHaveTextContent(t("screens.settings.notConnected"));
    expect(document.querySelector('[id^="card-title-app-sync-"]')).toBeNull();
    expect(screen.queryByText(/minutes ago/i)).toBeNull();
    expect(screen.queryByText(/10:42/)).toBeNull();
  });

  it("with Fitbit connected, exactly that card is connected and shows the real last sync", () => {
    state.providers = fitbitConnected;
    renderPage();
    const connected = t("screens.settings.connected");
    const connectedCards = HEALTH_CARD_IDS.filter((id) => badgesOf(id).includes(connected));
    expect(connectedCards).toEqual(["health-fitbit"]);

    // Expand the Fitbit card: the last sync is the gateway timestamp, locale-formatted.
    fireEvent.click(document.getElementById("card-title-health-fitbit")!);
    const formatted = fmtDateTime(new Date(FITBIT_SYNC));
    expect(
      screen.getByText(t("screens.settings.lastSyncLastsync", { lastSync: formatted })),
    ).toBeInTheDocument();

    openDataSyncTab();
    expect(screen.queryByTestId("per-app-sync-empty")).toBeNull();
    const syncCards = Array.from(document.querySelectorAll('[id^="card-title-app-sync-"]')).map((el) => el.id);
    expect(syncCards).toEqual(["card-title-app-sync-fitbit"]);
    expect(screen.getByText(`${t("screens.settings.lastSync2")} ${formatted}`)).toBeInTheDocument();
  });
});

describe("no hard-coded health connection state in source (VTID-05032)", () => {
  const root = path.resolve(__dirname, "../../../..");
  const connectedApps = readFileSync(path.join(root, "src/pages/settings/ConnectedApps.tsx"), "utf8");
  const integrationData = readFileSync(path.join(root, "src/components/settings/integrationData.ts"), "utf8");

  /** Source between the start marker and the next top-level/builder marker. */
  function slice(src: string, start: string, end: string): string {
    const a = src.indexOf(start);
    expect(a, `marker ${start}`).toBeGreaterThanOrEqual(0);
    const b = src.indexOf(end, a + start.length);
    expect(b, `marker ${end}`).toBeGreaterThan(a);
    return src.slice(a, b);
  }

  const literalLastSync = /\b(lastSync|newData)\s*:\s*['"`]/;

  it("ConnectedApps.tsx has no lastSync/newData string literal", () => {
    expect(connectedApps).not.toMatch(literalLastSync);
  });

  it("integrationData.ts fitness/health lists have no lastSync/newData string literal", () => {
    const lists =
      slice(integrationData, "export const fitnessIntegrations", "export const healthIntegrations") +
      slice(integrationData, "export const healthIntegrations", "export const productivityIntegrations");
    expect(lists).not.toMatch(literalLastSync);
  });

  it("no `connected: true` literal in the fitness/health lists or the health/Data Sync builders", () => {
    const scoped = [
      slice(integrationData, "export const fitnessIntegrations", "export const healthIntegrations"),
      slice(integrationData, "export const healthIntegrations", "export const productivityIntegrations"),
      slice(connectedApps, "const buildHealthCards", "// Clinical & Lab Integrations"),
      slice(connectedApps, "const connectedWearables", "  return (\n    <AppLayout>"),
    ];
    for (const block of scoped) expect(block).not.toMatch(/connected\s*:\s*true/);
  });
});
