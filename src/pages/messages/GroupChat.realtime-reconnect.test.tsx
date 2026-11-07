/**
 * VTID-05534 — a group chat thread reloads once after its realtime subscription
 * drops and comes back. Events lost while the subscription was down are picked
 * up without waiting for the 8 s fallback poll.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// VTID-05117: the page now reads the Spotlight flag; this suite covers the legacy (flag-off) screen.
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
import { render, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();

// Captures the single group channel GroupChat opens, so a test can fire its
// INSERT handler and report subscription status changes.
const realtime = vi.hoisted(() => ({
  insertHandler: null as null | (() => void),
  statusHandler: null as null | ((status: string) => void),
}));

vi.mock("@/integrations/supabase/realtime", () => {
  const channel = {
    on: (_type: string, _filter: unknown, handler: () => void) => {
      realtime.insertHandler = handler;
      return channel;
    },
    subscribe: (handler?: (status: string) => void) => {
      realtime.statusHandler = handler ?? null;
      return channel;
    },
  };
  return { realtimeChannel: () => channel, removeRealtimeChannel: vi.fn() };
});

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

const MESSAGES = Array.from({ length: 3 }, (_, i) => ({
  id: `m${3 - i}`,
  tenant_id: "t",
  sender_id: "other",
  group_id: "g1",
  content: `msg ${3 - i}`,
  created_at: new Date(2026, 5, 25, 16, 29 + (3 - i)).toISOString(),
  message_type: "text",
}));

const scrollIntoView = vi.fn();

async function renderGroup() {
  const view = render(
    <MemoryRouter initialEntries={["/inbox/g/g1"]}>
      <Routes>
        <Route path="/inbox/g/:groupId" element={<GroupChat />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
  return view;
}

describe("GroupChat realtime reconnect (VTID-05534)", () => {
  beforeEach(() => {
    realtime.insertHandler = null;
    realtime.statusHandler = null;
    scrollIntoView.mockReset();
    fetchGroup.mockReset().mockResolvedValue(GROUP);
    fetchGroupMessages.mockReset().mockResolvedValue(MESSAGES);
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("a realtime INSERT reloads the thread", async () => {
    await renderGroup();
    const before = fetchGroupMessages.mock.calls.length;

    await act(async () => {
      realtime.insertHandler?.();
    });

    expect(fetchGroupMessages.mock.calls.length).toBe(before + 1);
  });

  it("the first SUBSCRIBED does not reload the thread", async () => {
    await renderGroup();
    const before = fetchGroupMessages.mock.calls.length;

    await act(async () => {
      realtime.statusHandler?.("SUBSCRIBED");
    });

    expect(fetchGroupMessages.mock.calls.length).toBe(before);
  });

  it.each(["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"])(
    "after a %s drop, the next SUBSCRIBED reloads the thread once",
    async (dropStatus) => {
      await renderGroup();
      await act(async () => {
        realtime.statusHandler?.("SUBSCRIBED");
      });
      const before = fetchGroupMessages.mock.calls.length;

      await act(async () => {
        realtime.statusHandler?.(dropStatus);
      });
      expect(fetchGroupMessages.mock.calls.length).toBe(before);

      await act(async () => {
        realtime.statusHandler?.("SUBSCRIBED");
      });
      expect(fetchGroupMessages.mock.calls.length).toBe(before + 1);

      // A further SUBSCRIBED with no drop in between does not reload again.
      await act(async () => {
        realtime.statusHandler?.("SUBSCRIBED");
      });
      expect(fetchGroupMessages.mock.calls.length).toBe(before + 1);
    },
  );
});
