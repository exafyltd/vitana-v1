/**
 * VTID-05318 (messenger-ux-v2/ui-reply-jump) — replies in group chats: Reply on
 * a message puts it in the composer, the send carries reply_to_message_id, the
 * quote shows the original (fetched when it is not loaded) and jumps to it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();
const sendGroupMessage = vi.fn();
const fetchGroupMessagesAround = vi.fn();
vi.mock("@/hooks/useChatApi", () => ({
  fetchGroup: (...a: unknown[]) => fetchGroup(...a),
  fetchGroupMessages: (...a: unknown[]) => fetchGroupMessages(...a),
  sendGroupMessage: (...a: unknown[]) => sendGroupMessage(...a),
  fetchGroupMessagesAround: (...a: unknown[]) => fetchGroupMessagesAround(...a),
  fetchGroupMessagesAfter: vi.fn(async () => []),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: vi.fn(),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock("@/integrations/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock("@/lib/i18n-toast", async (orig) => ({ ...(await orig<typeof import("@/lib/i18n-toast")>()), t: (k: string) => k, notifyError: vi.fn() }));

type ComposerProps = { replyingTo?: { id: string } | null; onSendMessage: (...a: unknown[]) => unknown };
let composer: ComposerProps | null = null;
vi.mock("@/components/messages/MessageInput", () => ({
  default: (p: ComposerProps) => { composer = p; return <div data-testid="composer" data-reply={p.replyingTo?.id ?? ""} />; },
}));
type BubbleProps = { message: { id: string; body: string; reply_to_message_id?: string | null }; onReply?: (m: unknown) => void; parentMessage?: { body: string } | null; parentUnavailable?: boolean; onScrollToMessage?: (id: string) => void };
vi.mock("@/components/messages/MessageBubble", () => ({
  default: (p: BubbleProps) => (
    <div data-testid={`bubble-${p.message.id}`}>
      <button data-testid={`reply-${p.message.id}`} onClick={() => p.onReply?.(p.message)}>reply</button>
      {p.message.reply_to_message_id && (
        <button data-testid={`quote-${p.message.id}`} data-state={p.parentMessage ? "loaded" : p.parentUnavailable ? "unavailable" : "loading"}
          onClick={() => p.onScrollToMessage?.(p.message.reply_to_message_id!)}>{p.parentMessage?.body ?? ""}</button>
      )}
    </div>
  ),
}));

import GroupChat from "./GroupChat";

const GROUP = { id: "g1", name: "G", is_system: false, metadata: {}, members: [{ user_id: "me", display_name: "Me" }, { user_id: "ana", display_name: "Ana" }], member_count: 2 };
const row = (id: string, min: number, extra: Record<string, unknown> = {}) => ({
  id, tenant_id: "t", sender_id: "ana", group_id: "g1", content: id, created_at: new Date(2026, 9, 21, 10, min).toISOString(), message_type: "text", ...extra,
});

beforeEach(() => {
  composer = null;
  fetchGroup.mockReset().mockResolvedValue(GROUP);
  fetchGroupMessages.mockReset();
  sendGroupMessage.mockReset();
  fetchGroupMessagesAround.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
  class RO { observe() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", RO);
});

function open() {
  return render(
    <MemoryRouter initialEntries={["/inbox/g/g1"]}>
      <Routes><Route path="/inbox/g/:groupId" element={<GroupChat />} /></Routes>
    </MemoryRouter>,
  );
}

describe("GroupChat replies (VTID-05318)", () => {
  it("Reply puts the message in the composer and the send carries reply_to_message_id", async () => {
    fetchGroupMessages.mockResolvedValue([row("q1", 1)]);
    sendGroupMessage.mockImplementation(async (_g: string, content: string, o: { clientMessageId: string }) => row("a1", 2, { sender_id: "me", content, client_message_id: o.clientMessageId }));
    open();
    await screen.findByTestId("bubble-q1");
    fireEvent.click(screen.getByTestId("reply-q1"));
    expect(screen.getByTestId("composer").dataset.reply).toBe("q1");
    await act(async () => { await composer!.onSendMessage("answer", "text", null, undefined, "q1"); });
    await waitFor(() => expect(sendGroupMessage).toHaveBeenCalled());
    expect(sendGroupMessage.mock.calls[0][2]).toMatchObject({ replyToMessageId: "q1" });
    expect(screen.getByTestId("composer").dataset.reply).toBe("");
  });

  it("a quote whose original is not loaded fetches it once; one that is gone reads unavailable", async () => {
    fetchGroupMessages.mockResolvedValue([row("a1", 5, { reply_to_message_id: "old" }), row("a2", 6, { reply_to_message_id: "gone" })].reverse());
    fetchGroupMessagesAround.mockImplementation(async (_g: string, id: string) => (id === "old" ? { data: [row("old", 0)], has_older: false, has_newer: true } : null));
    open();
    await waitFor(() => expect(screen.getByTestId("quote-a1").dataset.state).toBe("loaded"));
    expect(screen.getByTestId("quote-a1").textContent).toBe("old");
    await waitFor(() => expect(screen.getByTestId("quote-a2").dataset.state).toBe("unavailable"));
    expect(fetchGroupMessagesAround).toHaveBeenCalledWith("g1", "old", 2);
  });
});
