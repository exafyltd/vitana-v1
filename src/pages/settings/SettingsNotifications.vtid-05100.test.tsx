/**
 * VTID-05100: the Vitana messages section has its own query and loading
 * state, so Settings › Notifications shows it while the other notification
 * preferences are still loading (a slow category fetch must not hide it).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// VTID-05111: the page reads the Spotlight flag; this harness pins it off (no router / tenant here).
vi.mock("@/hooks/useSpotlightEnabled", () => ({ useSpotlightEnabled: () => false }));
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/SubNavigation", () => ({ default: () => null }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/StandardHeader", () => ({ default: () => null }));
vi.mock("@/components/settings/VitanaMessagesSettings", () => ({
  VitanaMessagesSettings: () => <div data-testid="vitana-messages-settings" />,
}));

let prefsLoading = false;
let catLoading = false;

vi.mock("@/hooks/useNotifications", () => ({
  useNotificationPreferences: () => ({
    prefs: { push_enabled: true, dnd_enabled: false, dnd_start_time: null, dnd_end_time: null },
    loading: prefsLoading,
    updatePref: vi.fn(),
  }),
}));
vi.mock("@/hooks/useNotificationCategoryPreferences", () => ({
  useNotificationCategoryPreferences: () => ({
    loading: catLoading,
    toggleCategory: vi.fn(),
    role: null,
    roleNotifications: [],
    categories: { chat: [], calendar: [], community: [] },
  }),
}));

import SettingsNotifications from "./SettingsNotifications";

beforeEach(() => {
  prefsLoading = false;
  catLoading = false;
});

describe("SettingsNotifications — Vitana messages section (VTID-05100)", () => {
  it("shows the section once everything has loaded", () => {
    render(<SettingsNotifications />);
    expect(screen.getByTestId("vitana-messages-settings")).toBeInTheDocument();
  });

  it("shows the section while the category preferences are still loading", () => {
    catLoading = true;
    render(<SettingsNotifications />);
    expect(screen.getByTestId("vitana-messages-settings")).toBeInTheDocument();
  });

  it("shows the section while the push preferences are still loading", () => {
    prefsLoading = true;
    render(<SettingsNotifications />);
    expect(screen.getByTestId("vitana-messages-settings")).toBeInTheDocument();
  });
});
