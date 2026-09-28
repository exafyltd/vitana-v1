/**
 * VTID-04676: Settings › Notifications — categories match what is really
 * sent, stay switchable with push off, and locked categories stay on.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/SubNavigation", () => ({ default: () => null }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/StandardHeader", () => ({ default: () => null }));

const toggleCategory = vi.fn().mockResolvedValue({});
let catState: Record<string, unknown>;

vi.mock("@/hooks/useNotifications", () => ({
  useNotificationPreferences: () => ({
    prefs: { push_enabled: false, dnd_enabled: false, dnd_start_time: null, dnd_end_time: null },
    loading: false,
    updatePref: vi.fn(),
  }),
}));
vi.mock("@/hooks/useNotificationCategoryPreferences", () => ({
  useNotificationCategoryPreferences: () => catState,
}));

import SettingsNotifications from "./SettingsNotifications";

beforeEach(() => {
  toggleCategory.mockClear();
  catState = {
    loading: false,
    toggleCategory,
    role: null,
    roleNotifications: [],
    categories: {
      chat: [{ id: "c-dm", slug: "direct_messages", display_name: "Direct Messages", description: null, icon: null, enabled: true, locked: false, types: ["new_chat_message"] }],
      calendar: [],
      community: [
        { id: "c-posts", slug: "posts_reactions", display_name: "Posts & reactions", description: null, icon: null, enabled: true, locked: false, types: ["post_like"] },
        { id: "c-acct", slug: "account", display_name: "Account", description: null, icon: null, enabled: false, locked: true, types: ["welcome_to_vitana"] },
      ],
    },
  };
});

describe("SettingsNotifications (VTID-04676)", () => {
  it("keeps categories switchable when push is off — they decide in-app too", () => {
    render(<SettingsNotifications />);
    const posts = within(screen.getByTestId("member-category-posts_reactions")).getByRole("switch");
    expect(posts).not.toBeDisabled();
    fireEvent.click(posts);
    expect(toggleCategory).toHaveBeenCalledWith("c-posts", false);
  });

  it("shows a locked category as on and not switchable", () => {
    render(<SettingsNotifications />);
    const acct = within(screen.getByTestId("member-category-account")).getByRole("switch");
    expect(acct).toBeDisabled();
    expect(acct).toHaveAttribute("aria-checked", "true");
  });

  it("shows admins the notifications their role receives", () => {
    catState = {
      ...catState,
      role: "admin",
      roleNotifications: [{ type: "admin_insight_urgent", label: { en: "Urgent admin insight", de: "Dringender Admin-Hinweis" }, description: { en: "x", de: "y" } }],
    };
    render(<SettingsNotifications />);
    expect(screen.getByTestId("role-notifications")).toBeInTheDocument();
  });

  it("members see no role section", () => {
    render(<SettingsNotifications />);
    expect(screen.queryByTestId("role-notifications")).toBeNull();
  });
});
