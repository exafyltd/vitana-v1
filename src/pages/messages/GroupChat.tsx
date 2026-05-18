/**
 * Group Chat — VTID-03089
 *
 * Standalone view at /inbox/g/:groupId for the chat_groups system. Reached
 * via push notification deep-link from the gateway (notification url
 * `/inbox/g/<groupId>`). Integration with the unified /inbox list is a
 * follow-up.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { isVitanaBot, VITANA_BOT_AVATAR_URL, VITANA_BOT_DISPLAY_NAME } from "@/lib/vitanaBotIdentity";
import {
  fetchGroup,
  fetchGroupMessages,
  sendGroupMessage,
  markGroupRead,
  type ChatGroup,
  type ChatGroupMember,
  type ChatGroupMessage,
} from "@/hooks/useChatApi";

const POLL_INTERVAL_MS = 5000;

interface GroupWithMembers extends ChatGroup {
  members: ChatGroupMember[];
  member_count: number;
}

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [messages, setMessages] = useState<ChatGroupMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, ChatGroupMember>();
    (group?.members || []).forEach(m => map.set(m.user_id, m));
    return map;
  }, [group]);

  const reload = useCallback(async () => {
    if (!groupId) return;
    try {
      const [g, msgs] = await Promise.all([
        fetchGroup(groupId),
        fetchGroupMessages(groupId, 100),
      ]);
      setGroup(g);
      setMessages(msgs.slice().reverse());
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    setIsLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!groupId) return;
    markGroupRead(groupId).catch(() => {});
  }, [groupId, messages.length]);

  useEffect(() => {
    const id = setInterval(() => { reload(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reload]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !groupId || isSending) return;
    setIsSending(true);
    setDraft("");
    try {
      const newMsg = await sendGroupMessage(groupId, content);
      setMessages(prev => [...prev, newMsg]);
      composerRef.current?.focus();
    } catch (err: any) {
      setLoadError(err?.message || "Failed to send");
      setDraft(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading group…</div>
      </div>
    );
  }

  if (loadError && !group) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-2 font-medium">Couldn't open group</div>
          <div className="mb-4 text-sm text-red-600">{loadError}</div>
          <button
            className="rounded bg-gray-100 px-4 py-2 text-sm"
            onClick={() => navigate("/inbox")}
          >Back to Inbox</button>
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          aria-label="Back"
          className="rounded p-2 hover:bg-gray-100"
          onClick={() => navigate("/inbox")}
        >←</button>
        <div className="flex-1">
          <div className="font-semibold leading-tight">{group.name}</div>
          <div className="text-xs text-gray-500">
            {group.member_count} {group.member_count === 1 ? "member" : "members"}
            {group.is_system ? " · official group" : ""}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-gray-500">
            No messages yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map(msg => (
              <GroupMessageRow
                key={msg.id}
                message={msg}
                isMine={msg.sender_id === userId}
                sender={memberById.get(msg.sender_id)}
              />
            ))}
          </ul>
        )}
        <div ref={streamEndRef} />
      </main>

      <footer className="sticky bottom-0 border-t bg-white px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={composerRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message — type @vitana to ask Vitana"
            className="flex-1 resize-none rounded-2xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >{isSending ? "…" : "Send"}</button>
        </div>
      </footer>
    </div>
  );
}

function GroupMessageRow({
  message,
  isMine,
  sender,
}: {
  message: ChatGroupMessage;
  isMine: boolean;
  sender: ChatGroupMember | undefined;
}) {
  const senderIsBot = isVitanaBot(message.sender_id);
  const senderName = senderIsBot
    ? VITANA_BOT_DISPLAY_NAME
    : sender?.display_name || "Member";
  const avatarUrl = senderIsBot
    ? VITANA_BOT_AVATAR_URL
    : sender?.avatar_url || null;

  return (
    <li className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      {!isMine && (
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
          {avatarUrl ? (
            <img src={avatarUrl} alt={senderName} className="h-8 w-8 object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center text-xs font-medium text-gray-600">
              {senderName.slice(0, 1)}
            </div>
          )}
        </div>
      )}
      <div className={`max-w-[80%] ${isMine ? "items-end" : ""}`}>
        {!isMine && (
          <div className="mb-0.5 px-1 text-xs text-gray-500">
            {senderName}{senderIsBot ? " · bot" : ""}
          </div>
        )}
        <div
          className={
            `whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ` +
            (isMine
              ? "bg-blue-600 text-white rounded-br-sm"
              : senderIsBot
                ? "bg-purple-50 text-purple-950 rounded-bl-sm border border-purple-100"
                : "bg-gray-100 text-gray-900 rounded-bl-sm")
          }
        >{message.content}</div>
      </div>
    </li>
  );
}
