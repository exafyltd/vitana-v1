/**
 * VTID-04921 — a group chat ("Alle Beisammen") opens at the NEWEST message,
 * WhatsApp style. The scroll effect used to depend on messages.length alone, so
 * it never ran once the loading screen gave way to the list.
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
const scrollIntoView = vi.fn();

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

describe("GroupChat opens at the latest message (VTID-04921)", () => {
  beforeEach(() => {
    scrollTopWrites.length = 0;
    scrollIntoView.mockReset();
    fetchGroup.mockReset().mockResolvedValue(GROUP);
    fetchGroupMessages.mockReset().mockResolvedValue(MESSAGES);
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 5000 });
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get: () => 0,
      set: (v: number) => { scrollTopWrites.push(v); },
    });
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
  });

  it("jumps to the bottom once the list has rendered after loading", async () => {
    renderAt("/inbox/g/g1");
    await screen.findAllByTestId("bubble");
    expect(scrollTopWrites).toContain(5000);
  });

  it("does not jump to the bottom when opened from a reaction deep-link", async () => {
    renderAt("/inbox/g/g1/msg/m2");
    await screen.findAllByTestId("bubble");
    expect(scrollTopWrites).toEqual([]);
  });

  it("does not re-scroll when a poll returns the same messages", async () => {
    renderAt("/inbox/g/g1");
    await screen.findAllByTestId("bubble");
    // VTID-04928: let the one-frame re-pin after the first paint settle first.
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    scrollIntoView.mockClear();
    fetchGroupMessages.mockResolvedValue(MESSAGES.slice());
    await act(async () => { await Promise.resolve(); });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
