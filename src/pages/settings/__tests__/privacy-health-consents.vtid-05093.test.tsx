/**
 * VTID-05093 (Health Hub D10, WP2): Settings › Privacy › Data Sharing switches
 * reflect the member's real health consents (GET /api/v1/health/consents,
 * mocked here — no gateway or database is touched).
 *
 *   - off unless there is an active consent row; never defaultChecked;
 *   - off + disabled with a note while the store is pending, while the
 *     consent wording is a draft, or when loading fails;
 *   - an active consent is always on and can always be switched off (which
 *     opens the "withdraw?" confirmation, nothing is sent yet);
 *   - "Manage connected sources" lists one consent per partner and per
 *     wearable connector, and keeps an active consent withdrawable even for a
 *     partner the gateway no longer lists.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const { passthrough, nothing, adminFetch, lockState } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
  adminFetch: vi.fn(),
  lockState: { texts: {} as Record<string, unknown> },
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
// VTID-05117 (from main): Privacy renders a Spotlight frame behind a tenant flag; this suite covers the legacy screen.
vi.mock("@/hooks/useSpotlightEnabled", () => ({ useSpotlightEnabled: () => false }));
vi.mock("@/hooks/useAIConsent", () => ({
  useAIConsent: () => ({ hasConsent: false, dialogOpen: false, setDialogOpen: vi.fn(), grantConsent: vi.fn(), revokeConsent: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ adminFetch }));
vi.mock("@/i18n/health-consent-texts.lock.json", () => ({ default: lockState }));

import Privacy from "../Privacy";
import { catalogs } from "@/i18n";
import { setI18nLocale, t } from "@/lib/i18n-toast";
import { HEALTH_CONSENT_CATEGORIES } from "@/lib/health-consent-wording";

const API = "/api/v1/health/consents";
const UI = "screens.settings.healthConsentUi";
const SWITCHES = {
  health_data_analytics: "screens.settings.healthDataAnalytics",
  community_insights: "screens.settings.communityInsights",
} as const;

const CATEGORIES = HEALTH_CONSENT_CATEGORIES.map((key, i) => ({
  key,
  resource_type: "x",
  scope: "x",
  per_resource: key === "wearables" || key === "partner_results",
  current_text_version: "v1",
  processing_active: false,
  sort: i,
}));

function state(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    store_pending: false,
    categories: CATEGORIES,
    consents: [],
    partners: [
      { partner_key: "labnord", display_name: "Labor Nord", status: "active" },
      { partner_key: "labsued", display_name: "Labor Süd", status: "sandbox" },
    ],
    connectors: [{ id: "fitbit", display_name: "Fitbit" }],
    ...over,
  };
}

const row = (category: string, resource_id = category) => ({
  category,
  resource_id,
  active: true,
  granted_at: "2026-10-01T10:00:00.000Z",
  revoked_at: null,
  granted_via: "settings_privacy",
  text_version: "v1",
  shown_locale: "de",
});

function releaseWithTestWording() {
  lockState.texts = Object.fromEntries(
    HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: "released", locales: { de: "sha", en: "sha" } } }]),
  );
  const tree = ((catalogs["de-DE"].screens as Record<string, unknown>).settings as Record<string, unknown>).healthConsent as Record<
    string,
    Record<string, unknown>
  >;
  for (const c of HEALTH_CONSENT_CATEGORIES) tree[c].v1 = { title: `Title ${c}`, body: `Body ${c}`, checkbox: `Box ${c}` };
}

function renderPrivacy(body: unknown) {
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === API && !init?.method) {
      if (body instanceof Error) throw body;
      return body;
    }
    throw new Error(`unexpected ${init?.method ?? "GET"} ${path}`);
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/settings/privacy?section=data"]}>
        <Privacy />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// `hidden: true` — once a dialog is open, Radix hides the page behind it from the a11y tree.
const sw = (category: keyof typeof SWITCHES) => screen.getByRole("switch", { name: t(SWITCHES[category]), hidden: true });

beforeEach(() => {
  adminFetch.mockReset();
  setI18nLocale("de-DE");
  lockState.texts = Object.fromEntries(HEALTH_CONSENT_CATEGORIES.map((c) => [c, { v1: { status: "draft" } }]));
});

describe("Privacy › health consent switches (VTID-05093)", () => {
  it("store_pending: both switches off and disabled with the 'being set up' note", async () => {
    renderPrivacy(state({ store_pending: true, categories: [] }));
    await waitFor(() => expect(screen.getByTestId("health-consent-note-health_data_analytics")).toHaveTextContent(t(`${UI}.storePendingShort`)));
    for (const c of Object.keys(SWITCHES) as (keyof typeof SWITCHES)[]) {
      expect(sw(c), c).toHaveAttribute("aria-checked", "false");
      expect(sw(c), c).toBeDisabled();
    }
  });

  it("draft wording: both switches off and disabled with the 'coming soon' note", async () => {
    renderPrivacy(state());
    await waitFor(() => expect(screen.getByTestId("health-consent-note-community_insights")).toHaveTextContent(t(`${UI}.draftPendingShort`)));
    for (const c of Object.keys(SWITCHES) as (keyof typeof SWITCHES)[]) {
      expect(sw(c), c).toHaveAttribute("aria-checked", "false");
      expect(sw(c), c).toBeDisabled();
    }
  });

  it("load failure: off and disabled with the 'not available' note", async () => {
    renderPrivacy(new Error("CONSENTS_UNAVAILABLE"));
    await waitFor(() => expect(screen.getByTestId("health-consent-note-health_data_analytics")).toHaveTextContent(t(`${UI}.unavailableShort`)));
    expect(sw("health_data_analytics")).toBeDisabled();
    expect(sw("health_data_analytics")).toHaveAttribute("aria-checked", "false");
  });

  it("an active consent is on and can be switched off even while the wording is a draft — that opens the withdraw confirmation", async () => {
    renderPrivacy(state({ consents: [row("health_data_analytics")] }));
    await waitFor(() => expect(sw("health_data_analytics")).toHaveAttribute("aria-checked", "true"));
    expect(sw("health_data_analytics")).toBeEnabled();
    expect(sw("community_insights")).toHaveAttribute("aria-checked", "false");
    expect(sw("community_insights")).toBeDisabled();

    fireEvent.click(sw("health_data_analytics"));
    expect(await screen.findByText(t(`${UI}.revokeConfirmBody`))).toBeInTheDocument();
    // Nothing is sent until the member confirms.
    expect(adminFetch.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    expect(sw("health_data_analytics")).toHaveAttribute("aria-checked", "true");
  });

  it("an inactive (revoked) row reads as off", async () => {
    renderPrivacy(state({ consents: [{ ...row("community_insights"), active: false, revoked_at: "2026-10-02T00:00:00.000Z" }] }));
    await waitFor(() => expect(screen.getByTestId("health-consent-note-community_insights")).toBeInTheDocument());
    expect(sw("community_insights")).toHaveAttribute("aria-checked", "false");
  });

  it("released wording: switches enabled but off; turning one on opens the dialog with an unticked box and Grant disabled", async () => {
    releaseWithTestWording();
    renderPrivacy(state());
    await waitFor(() => expect(sw("community_insights")).toBeEnabled());
    expect(sw("community_insights")).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByTestId("health-consent-note-community_insights")).toBeNull();

    fireEvent.click(sw("community_insights"));
    expect(await screen.findByText("Body community_insights")).toBeInTheDocument();
    expect(screen.getByTestId("health-consent-checkbox")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: t(`${UI}.grant`) })).toBeDisabled();
    expect(sw("community_insights")).toHaveAttribute("aria-checked", "false");
  });

  it("never defaults a health switch to on in source", () => {
    const root = resolve(__dirname, "../../../..");
    const switchSrc = readFileSync(resolve(root, "src/components/settings/HealthConsentSwitch.tsx"), "utf8");
    expect(switchSrc).not.toMatch(/defaultChecked/);
    expect(switchSrc).toMatch(/checked=\{checked\}/);
    expect(switchSrc).toMatch(/const checked = availability === 'active';/);
    // The Data Sharing card's health switches are all HealthConsentSwitch — no free-standing Switch left in it.
    const privacy = readFileSync(resolve(root, "src/pages/settings/Privacy.tsx"), "utf8");
    const block = privacy.slice(privacy.indexOf("VTID-05093 (Health Hub D10)"), privacy.indexOf("{/* AI Data Sharing Consent */}"));
    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/<Switch\b/);
    expect(block.match(/<HealthConsentSwitch\b/g)).toHaveLength(2);
  });
});

describe("Privacy › Manage connected sources (VTID-05093)", () => {
  it("lists one consent per partner and per wearable connector; nothing grantable while the store is pending", async () => {
    renderPrivacy(state({ store_pending: true, categories: [] }));
    fireEvent.click(await screen.findByRole("button", { name: t(`${UI}.manageSources`) }));

    const dialog = await screen.findByTestId("health-consent-sources-dialog");
    expect(within(dialog).getByText(t(`${UI}.storePending`))).toBeInTheDocument();
    const partners = within(within(dialog).getByTestId("health-consent-sources-partner_results")).getAllByTestId("health-consent-source");
    expect(partners.map((p) => p.querySelector("p")?.textContent)).toEqual(["Labor Nord", "Labor Süd"]);
    const devices = within(within(dialog).getByTestId("health-consent-sources-wearables")).getAllByTestId("health-consent-source");
    expect(devices.map((p) => p.querySelector("p")?.textContent)).toEqual(["Fitbit"]);
    for (const b of within(dialog).getAllByRole("button", { name: t(`${UI}.allow`) })) expect(b).toBeDisabled();
  });

  it("a legacy active partner consent (no longer listed) stays withdrawable while the store is pending", async () => {
    renderPrivacy(
      state({
        store_pending: true,
        categories: [],
        consents: [{ ...row("partner_results", "oldlab"), text_version: null, shown_locale: null }],
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: t(`${UI}.manageSources`) }));
    const dialog = await screen.findByTestId("health-consent-sources-dialog");
    const items = within(dialog).getAllByTestId("health-consent-source");
    const legacy = items.find((i) => i.textContent?.includes("oldlab"))!;
    expect(legacy).toBeTruthy();
    const withdraw = within(legacy).getByRole("button", { name: t(`${UI}.revoke`) });
    expect(withdraw).toBeEnabled();
    fireEvent.click(withdraw);
    expect(await screen.findByText(t(`${UI}.revokeConfirmBody`))).toBeInTheDocument();
  });

  it("with released wording, a listed partner can be opened for consent", async () => {
    releaseWithTestWording();
    renderPrivacy(state());
    fireEvent.click(await screen.findByRole("button", { name: t(`${UI}.manageSources`) }));
    const dialog = await screen.findByTestId("health-consent-sources-dialog");
    const nord = within(dialog).getAllByTestId("health-consent-source").find((i) => i.textContent?.includes("Labor Nord"))!;
    const allow = within(nord).getByRole("button", { name: t(`${UI}.allow`) });
    expect(allow).toBeEnabled();
    fireEvent.click(allow);
    expect(await screen.findByText("Body partner_results")).toBeInTheDocument();
    expect(screen.getByTestId("health-consent-checkbox")).toHaveAttribute("aria-checked", "false");
  });
});
