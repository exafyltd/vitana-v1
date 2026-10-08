/**
 * VTID-04928 — a group chat lands where the member expects, whichever element
 * scrolls.
 *
 * Owner report 2026-10-06: after VTID-04921, opening "Alle Beisammen" — and
 * tapping a group-message push — landed on the OLDEST message in the Android
 * app. VTID-04921 only set `main.scrollTop`; in the app's webview the document
 * can be what scrolls, so that did nothing. Now:
 *   - a normal open also brings the page's end marker (after the composer)
 *     into view, which moves whatever ancestor scrolls;
 *   - a push / reaction deep link (/inbox/g/:groupId/msg/:messageId) lands on
 *     that message, and falls back to the newest message if it is not loaded;
 *   - the view stays pinned while the list grows, until the member touches.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({ translate: (k: string) => k }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});

vi.mock("@/components/messages/MessageInput", () => ({ default: () => <div data-testid="composer" /> }));
vi.mock("@/components/messages/MessageBubble", () => ({ default: () => <div data-testid="bubble" /> }));

import GroupChat from "./GroupChat";

const GROUP = {
  id: "g1",
  name: "Alle Beisammen",
  is_system: true,
  metadata: {},
  members: [{ user_id: "me", display_name: "Me" }],
  member_count: 1,
};

// Newest first, like the gateway returns them.
const MESSAGES = Array.from({ length: 5 }, (_, i) => ({
  id: `m${5 - i}`,
  tenant_id: "t",
  sender_id: "other",
  group_id: "g1",
  content: `msg ${5 - i}`,
  created_at: new Date(2026, 5, 25, 16, 29 + (5 - i)).toISOString(),
  message_type: "text",
}));

const scrollTopWrites: number[] = [];
const intoView: Array<{ el: Element; opts: unknown }> = [];
let resizeCallbacks: Array<() => void> = [];

class FakeResizeObserver {
  cb: () => void;
  constructor(cb: () => void) { this.cb = cb; resizeCallbacks.push(cb); }
  observe() {}
  disconnect() { resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb); }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inbox/g/:groupId" element={<GroupChat />} />
        <Route path="/inbox/g/:groupId/msg/:messageId" element={<GroupChat />} />
      </Routes>
    </MemoryRouter>,
  );
}

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

/** The element after the composer footer — the page's end marker. */
function pageEnd(): Element | null {
  return document.querySelector("footer")?.nextElementSibling ?? null;
}

describe("GroupChat lands on the right message whichever element scrolls (VTID-04928)", () => {
  beforeEach(() => {
    scrollTopWrites.length = 0;
    intoView.length = 0;
    resizeCallbacks = [];
    fetchGroup.mockReset().mockResolvedValue(GROUP);
    fetchGroupMessages.mockReset().mockResolvedValue(MESSAGES);
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 5000 });
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get: () => 0,
      set: (v: number) => { scrollTopWrites.push(v); },
    });
    Element.prototype.scrollIntoView = function (this: Element, opts?: unknown) {
      intoView.push({ el: this, opts });
    } as typeof Element.prototype.scrollIntoView;
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
    vi.unstubAllGlobals();
  });

  it("a normal open also scrolls the page end into view (the document may be the scroller)", async () => {
    renderAt("/inbox/g/g1");
    await screen.findAllByTestId("bubble");
    await settle();
    const end = pageEnd();
    expect(end).toBeTruthy();
    expect(intoView.some((c) => c.el === end)).toBe(true);
    expect(scrollTopWrites).toContain(5000);
  });

  it("a push deep link lands on that message, not the bottom or the top", async () => {
    renderAt("/inbox/g/g1/msg/m2");
    await screen.findAllByTestId("bubble");
    await settle();
    const target = document.getElementById("msg-m2");
    expect(intoView.some((c) => c.el === target && (c.opts as { block?: string })?.block === "center")).toBe(true);
    expect(intoView.some((c) => c.el === pageEnd())).toBe(false);
    expect(scrollTopWrites).toEqual([]);
  });

  it("a deep link to a message that is not loaded opens at the newest message", async () => {
    renderAt("/inbox/g/g1/msg/not-loaded");
    await screen.findAllByTestId("bubble");
    await settle();
    expect(scrollTopWrites).toContain(5000);
    expect(intoView.some((c) => c.el === pageEnd())).toBe(true);
  });

  it("stays pinned while the list grows, and lets go after the member touches", async () => {
    renderAt("/inbox/g/g1");
    await screen.findAllByTestId("bubble");
    await settle();
    expect(resizeCallbacks.length).toBeGreaterThan(0);

    scrollTopWrites.length = 0;
    act(() => resizeCallbacks.forEach((cb) => cb()));
    expect(scrollTopWrites).toContain(5000);

    window.dispatchEvent(new Event("touchstart"));
    scrollTopWrites.length = 0;
    intoView.length = 0;
    act(() => resizeCallbacks.forEach((cb) => cb()));
    expect(scrollTopWrites).toEqual([]);
    expect(intoView).toEqual([]);
  });
});
