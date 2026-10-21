/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — group chat: a new message
 * no longer drags the member down while they read earlier messages (it used to
 * smooth-scroll to the bottom on every message once the pin was released).
 * Instead "↓ N new messages" appears; a tap goes to the newest message.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
import { render, screen, act, fireEvent } from "@testing-library/react";
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
vi.mock("@/components/messages/MessageBubble", () => ({ default: () => <div data-testid="bubble" /> }));
vi.mock("@/lib/i18n-toast", async (orig) => ({
  ...(await orig<typeof import("@/lib/i18n-toast")>()),
  t: (k: string) => k,
}));

import GroupChat from "./GroupChat";

const GROUP = { id: "g1", name: "G", is_system: false, metadata: {}, members: [{ user_id: "me", display_name: "Me" }], member_count: 1 };
const row = (i: number, sender = "other") => ({
  id: `m${i}`, tenant_id: "t", sender_id: sender, group_id: "g1", content: `msg ${i}`,
  created_at: new Date(2026, 9, 21, 10, i).toISOString(), message_type: "text",
});

let scrollTop = 0;
const scrollTopWrites: number[] = [];
const smoothScrolls: unknown[] = [];

beforeEach(() => {
  realtime.length = 0;
  scrollTopWrites.length = 0;
  smoothScrolls.length = 0;
  scrollTop = 0;
  fetchGroup.mockReset().mockResolvedValue(GROUP);
  fetchGroupMessages.mockReset().mockResolvedValue([row(3), row(2), row(1)]);
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 5000 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 500 });
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => { scrollTopWrites.push(v); scrollTop = v; },
  });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = function (opts: unknown) { smoothScrolls.push(opts); } as typeof Element.prototype.scrollTo;
  class RO { observe() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", RO);
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
  vi.unstubAllGlobals();
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

function open() {
  return render(
    <MemoryRouter initialEntries={["/inbox/g/g1"]}>
      <Routes><Route path="/inbox/g/:groupId" element={<GroupChat />} /></Routes>
    </MemoryRouter>,
  );
}

describe("GroupChat new messages without forced scrolling (VTID-05319)", () => {
  it("reading earlier messages: a new message shows the pill and does not move the view; the pill goes down", async () => {
    open();
    await screen.findAllByTestId("bubble");
    await settle();
    // The member takes over and scrolls up.
    window.dispatchEvent(new Event("touchstart"));
    scrollTop = 1000;
    fireEvent.scroll(document.querySelector("main")!);
    scrollTopWrites.length = 0;

    fetchGroupMessages.mockResolvedValue([row(4), row(3), row(2), row(1)]);
    await act(async () => { realtime.forEach((cb) => cb()); });
    await settle();

    expect(smoothScrolls).toEqual([]);
    expect(scrollTopWrites).toEqual([]);
    const pill = screen.getByTestId("new-messages-pill");
    expect(pill.textContent).toContain("inbox.newMessages.one");

    fireEvent.click(pill);
    expect(scrollTopWrites).toContain(5000);
    expect(screen.queryByTestId("new-messages-pill")).toBeNull();
  });

  it("at the bottom a new message keeps the newest in view, without a pill", async () => {
    open();
    await screen.findAllByTestId("bubble");
    await settle();
    window.dispatchEvent(new Event("touchstart"));
    scrollTop = 4500; // at the bottom (5000 - 500)
    fireEvent.scroll(document.querySelector("main")!);
    scrollTopWrites.length = 0;

    fetchGroupMessages.mockResolvedValue([row(4), row(3), row(2), row(1)]);
    await act(async () => { realtime.forEach((cb) => cb()); });
    await settle();
    expect(scrollTopWrites).toContain(5000);
    expect(screen.queryByTestId("new-messages-pill")).toBeNull();
  });
});
