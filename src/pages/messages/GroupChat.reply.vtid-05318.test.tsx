/**
 * VTID-05318 (messenger-ux-v2/ui-reply-jump) — replies in group chats: Reply on
 * a message puts it in the composer, the send carries reply_to_message_id, the
 * quote shows the original (fetched when it is not loaded) and jumps to it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();
const sendGroupMessage = vi.fn();
const fetchGroupMessagesAround = vi.fn();
const fetchGroupMessagesAfter = vi.fn(async (..._a: unknown[]) => [] as unknown[]);
const deleteGroupMessage = vi.fn(async () => undefined);
vi.mock("@/hooks/useChatApi", () => ({
  fetchGroup: (...a: unknown[]) => fetchGroup(...a),
  fetchGroupMessages: (...a: unknown[]) => fetchGroupMessages(...a),
  sendGroupMessage: (...a: unknown[]) => sendGroupMessage(...a),
  fetchGroupMessagesAround: (...a: unknown[]) => fetchGroupMessagesAround(...a),
  fetchGroupMessagesAfter: (...a: unknown[]) => fetchGroupMessagesAfter(...a),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: (...a: unknown[]) => deleteGroupMessage(...(a as [])),
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
type BubbleProps = { message: { id: string; body: string; reply_to_message_id?: string | null }; onReply?: (m: unknown) => void; onDeleteMessage?: (id: string) => unknown; parentMessage?: { body: string } | null; parentUnavailable?: boolean; onScrollToMessage?: (id: string) => void };
vi.mock("@/components/messages/MessageBubble", () => ({
  default: (p: BubbleProps) => (
    <div data-testid={`bubble-${p.message.id}`}>
      <button data-testid={`reply-${p.message.id}`} onClick={() => p.onReply?.(p.message)}>reply</button>
      <button data-testid={`del-${p.message.id}`} onClick={() => p.onDeleteMessage?.(p.message.id)}>delete</button>
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
  fetchGroupMessagesAfter.mockReset().mockResolvedValue([]);
  deleteGroupMessage.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  class RO { observe() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", RO);
});

let goTo: ((path: string) => void) | null = null;
function Nav() { goTo = useNavigate(); return null; }
function open() {
  return render(
    <MemoryRouter initialEntries={["/inbox/g/g1"]}>
      <Nav />
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

  it("a voice or attachment send (no parent id) still answers the open reply preview", async () => {
    fetchGroupMessages.mockResolvedValue([row("q1", 1)]);
    sendGroupMessage.mockImplementation(async (_g: string, content: string, o: { clientMessageId: string }) => row("v1", 2, { sender_id: "me", content, client_message_id: o.clientMessageId }));
    open();
    await screen.findByTestId("bubble-q1");
    fireEvent.click(screen.getByTestId("reply-q1"));
    await act(async () => { await composer!.onSendMessage("", "voice", { attachments: [{ url: "u" }] }); });
    await waitFor(() => expect(sendGroupMessage).toHaveBeenCalled());
    expect(sendGroupMessage.mock.calls[0][2]).toMatchObject({ replyToMessageId: "q1" });
  });

  it("opening another group drops the reply preview of the previous one", async () => {
    fetchGroupMessages.mockResolvedValue([row("q1", 1)]);
    fetchGroup.mockImplementation(async (id: string) => ({ ...GROUP, id }));
    open();
    await screen.findByTestId("bubble-q1");
    fireEvent.click(screen.getByTestId("reply-q1"));
    expect(screen.getByTestId("composer").dataset.reply).toBe("q1");
    fetchGroupMessages.mockResolvedValue([row("x1", 1, { group_id: "g2" })]);
    await act(async () => { goTo!("/inbox/g/g2"); });
    await screen.findByTestId("bubble-x1");
    expect(screen.getByTestId("composer").dataset.reply).toBe("");
  });

  it("a window that arrives after switching group is not shown in the new group", async () => {
    fetchGroupMessages.mockResolvedValue([row("a1", 50, { reply_to_message_id: "old" })]);
    fetchGroup.mockImplementation(async (id: string) => ({ ...GROUP, id }));
    let release: (() => void) | null = null;
    fetchGroupMessagesAround.mockImplementation(async (_g: string, id: string, limit: number) => {
      if (limit === 2) return { data: [], has_older: false, has_newer: false }; // quote prefetch: not found
      await new Promise<void>((r) => { release = r; });
      return { data: [row(id, 0)], has_older: false, has_newer: false };
    });
    open();
    await screen.findByTestId("quote-a1");
    fireEvent.click(screen.getByTestId("quote-a1"));
    await waitFor(() => expect(release).not.toBeNull());
    fetchGroupMessages.mockResolvedValue([row("x1", 1, { group_id: "g2" })]);
    await act(async () => { goTo!("/inbox/g/g2"); });
    await screen.findByTestId("bubble-x1");
    await act(async () => { release!(); await new Promise((r) => setTimeout(r, 20)); });
    expect(screen.queryByTestId("bubble-old")).toBeNull();
  });

  it("a message deleted after a jump stays deleted (the jump window never brings it back)", async () => {
    // Latest page: n1 (newest) and a reply to a far older message.
    fetchGroupMessages.mockResolvedValue([row("n1", 50), row("a1", 49, { reply_to_message_id: "old" })]);
    fetchGroupMessagesAround.mockImplementation(async (_g: string, id: string, limit: number) =>
      limit === 2 ? { data: [], has_older: false, has_newer: false } : { data: [row(id, 0)], has_older: false, has_newer: true });
    // The bridge reaches into the latest page (n1 included).
    fetchGroupMessagesAfter.mockResolvedValue([row("mid", 10), row("a1", 49, { reply_to_message_id: "old" }), row("n1", 50)]);
    open();
    await screen.findByTestId("quote-a1");
    fireEvent.click(screen.getByTestId("quote-a1"));
    await screen.findByTestId("bubble-old");
    expect(screen.getByTestId("bubble-mid")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByTestId("del-n1")); });
    await waitFor(() => expect(deleteGroupMessage).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId("bubble-n1")).toBeNull());
    expect(screen.getByTestId("bubble-old")).toBeTruthy();
  });
});

