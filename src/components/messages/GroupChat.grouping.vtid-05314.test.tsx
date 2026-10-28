/**
 * VTID-05314 (messenger-ux-v2/ui-compact-grouping) — group chat: positions per
 * sender run, and the standalone layout keeps main's `space-y-2` (so day
 * dividers keep their spacing) with only in-group bubbles moved up to 2 px.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/hooks/useSpotlightEnabled", () => ({ useSpotlightEnabled: () => false }));
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();
vi.mock("@/hooks/useChatApi", () => ({
  fetchGroup: (...a: unknown[]) => fetchGroup(...a),
  fetchGroupMessages: (...a: unknown[]) => fetchGroupMessages(...a),
  sendGroupMessage: vi.fn(),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: vi.fn(),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
const realtime: Array<() => void> = [];
vi.mock("@/integrations/supabase/realtime", () => ({
  realtimeChannel: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- channel stub
    const ch: any = { on: (_k: string, _f: unknown, cb: () => void) => { realtime.push(cb); return ch; }, subscribe: () => ch };
    return ch;
  },
  removeRealtimeChannel: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock("@/components/messages/MessageInput", () => ({ default: () => <div data-testid="composer" /> }));
vi.mock("@/components/messages/MessageBubble", () => ({
  default: (p: { message: { id: string }; groupPosition?: string }) => <div data-testid={`bubble-${p.message.id}`} data-pos={p.groupPosition ?? ""} />,
}));
vi.mock("@/lib/i18n-toast", async (orig) => ({
  ...(await orig<typeof import("@/lib/i18n-toast")>()),
  t: (k: string) => k,
}));

import GroupChat from "@/pages/messages/GroupChat";

const GROUP = { id: "g1", name: "G", is_system: false, metadata: {}, members: [{ user_id: "me", display_name: "Me" }], member_count: 1 };
const row = (id: string, sender: string, min: number, extra: Record<string, unknown> = {}) => ({
  id, tenant_id: "t", sender_id: sender, group_id: "g1", content: id, created_at: new Date(2026, 9, 21, 10, min).toISOString(), message_type: "text", ...extra,
});

beforeEach(() => {
  fetchGroup.mockReset().mockResolvedValue(GROUP);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  class RO { observe() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", RO);
});

describe("GroupChat grouping (VTID-05314)", () => {
  it("positions per sender run (system notices and > 5 min break it); in-group bubbles get !mt-0.5 inside space-y-2", async () => {
    fetchGroupMessages.mockResolvedValue([
      row("a1", "ana", 1), row("a2", "ana", 2), row("a3", "ana", 3),
      row("n1", "ana", 4, { message_type: "system" }),
      row("a4", "ana", 5), row("a5", "ana", 20),
      row("b1", "bob", 21),
    ].reverse());
    render(
      <MemoryRouter initialEntries={["/inbox/g/g1"]}>
        <Routes><Route path="/inbox/g/:groupId" element={<GroupChat />} /></Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId("bubble-a1");
    const p = (id: string) => screen.getByTestId(`bubble-${id}`).dataset.pos;
    expect(["a1", "a2", "a3", "n1", "a4", "a5", "b1"].map(p)).toEqual(["first", "middle", "last", "single", "single", "single", "single"]);
    const wrap = (id: string) => document.getElementById(`msg-${id}`)!;
    expect(wrap("a1").parentElement!.className).toBe("space-y-2");
    expect(wrap("a1").className).not.toContain("mt-0.5");
    expect(wrap("a2").className).toContain("!mt-0.5");
    expect(wrap("a3").className).toContain("!mt-0.5");
    expect(wrap("a4").className).not.toContain("mt-0.5");
    // The day divider is a direct child of the space-y-2 list, as on main.
    expect(wrap("a1").parentElement!.firstElementChild!.id).not.toBe("msg-a1");
  });
});
