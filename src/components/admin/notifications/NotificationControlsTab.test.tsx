/**
 * VTID-04675: Admin › Notifications › Notifications tab.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { NotificationControl, NotificationControlsResponse } from "@/hooks/useNotificationControls";

const mutateAsync = vi.fn().mockResolvedValue({ ok: true });
let response: { data?: NotificationControlsResponse; isLoading: boolean; error: Error | null };

vi.mock("@/hooks/useNotificationControls", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useNotificationControls")>("@/hooks/useNotificationControls");
  return {
    ...actual,
    useNotificationControls: () => response,
    useSetNotificationControl: () => ({ mutateAsync, isPending: false }),
    useNotificationControlAudit: () => ({ data: [], isLoading: false, error: null }),
  };
});

import { NotificationControlsTab } from "./NotificationControlsTab";

function control(over: Partial<NotificationControl>): NotificationControl {
  return {
    type: "post_like",
    audience: "member",
    group: "posts",
    trigger: "member_activity",
    text: "ready",
    label: { en: "Like on your post", de: "Like auf deinen Beitrag" },
    description: { en: "Someone liked your post.", de: "Jemand hat deinen Beitrag geliked." },
    in_catalog: true,
    enabled: true,
    auto_registered: false,
    registered: true,
    reason: null,
    updated_at: null,
    updated_by_email: null,
    can_enable: true,
    category: { id: "c1", slug: "posts_reactions", name: "Posts & reactions", member_can_disable: true },
    automations: [],
    stats: { sent: 12, pushed: 9, read: 4, blocked_admin: 0, blocked_member: 2, last_sent_at: "2026-09-27T10:00:00Z" },
    ...over,
  };
}

function setData(controls: NotificationControl[], extra: Partial<NotificationControlsResponse> = {}) {
  response = {
    isLoading: false,
    error: null,
    data: {
      ok: true,
      days: 7,
      controls,
      stats_error: null,
      categories_error: null,
      audience: { member: 120, admin: 3, developer: 2, staff: 0 },
      ...extra,
    },
  };
}

beforeEach(() => {
  mutateAsync.mockClear();
});

describe("NotificationControlsTab", () => {
  it("groups types by who receives them and shows the switch state", () => {
    setData([
      control({}),
      control({ type: "admin_insight_urgent", audience: "admin", group: "admin", enabled: false,
        label: { en: "Urgent admin insight", de: "Dringender Admin-Hinweis" } }),
    ]);
    render(<NotificationControlsTab />);
    const like = screen.getByTestId("control-post_like");
    expect(within(like).getByRole("switch")).toHaveAttribute("aria-checked", "true");
    const admin = screen.getByTestId("control-admin_insight_urgent");
    expect(within(admin).getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("asks for confirmation before switching, then sends the switch with the reason", async () => {
    setData([control({ enabled: false })]);
    render(<NotificationControlsTab />);
    fireEvent.click(within(screen.getByTestId("control-post_like")).getByRole("switch"));
    expect(mutateAsync).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "launch" } });
    fireEvent.click(within(dialog).getAllByRole("button").at(-1)!);
    expect(mutateAsync).toHaveBeenCalledWith({ type: "post_like", enabled: true, reason: "launch", source_key: undefined });
  });

  it("does not let an English-only type be switched on", () => {
    setData([control({ type: "admin_digest", enabled: false, can_enable: false, text: "not_localized" })]);
    render(<NotificationControlsTab />);
    expect(within(screen.getByTestId("control-admin_digest")).getByRole("switch")).toBeDisabled();
  });

  it("switches one automation's sends separately", async () => {
    setData([
      control({
        type: "orb_suggestion",
        automations: [{ source_key: "AP-0701", name: "Suggest", enabled: false, auto_registered: true,
          text: "ready", can_enable: true, updated_at: null, updated_by_email: null }],
      }),
    ]);
    render(<NotificationControlsTab />);
    const switches = within(screen.getByTestId("control-orb_suggestion")).getAllByRole("switch");
    fireEvent.click(switches[1]);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getAllByRole("button").at(-1)!);
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ type: "orb_suggestion", source_key: "AP-0701", enabled: true }));
  });

  it("shows unreadable numbers as an error, never as zeros", () => {
    setData([control({ stats: null })], { stats_error: "timeout" });
    render(<NotificationControlsTab />);
    expect(screen.queryByText(/7 (Tage|days):/)).toBeNull();
    expect(screen.getAllByText(/timeout/).length).toBeGreaterThan(0);
  });

  it("shows a load failure instead of an empty list", () => {
    response = { isLoading: false, error: new Error("FORBIDDEN"), data: undefined };
    render(<NotificationControlsTab />);
    expect(screen.getByText(/FORBIDDEN/)).toBeInTheDocument();
  });
});
