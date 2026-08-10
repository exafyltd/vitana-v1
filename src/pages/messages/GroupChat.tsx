/**
 * Group Chat — VTID-03089
 *
 * Standalone view at /inbox/g/:groupId for the chat_groups system. Reached
 * via push notification deep-link from the gateway (notification url
 * `/inbox/g/<groupId>`) and from the unified inbox list (Messages.tsx
 * routes chat_group: thread ids here).
 *
 * Composes the same primitives DMs use — MessageInput (emoji, attach,
 * voice) and MessageBubble (reactions, signed-url refresh, voice player) —
 * so feature parity is structural, not duplicated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import MessageInput from "@/components/messages/MessageInput";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageDivider from "@/components/messages/MessageDivider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchGroup,
  fetchGroupMessages,
  sendGroupMessage,
  markGroupRead,
  updateGroupMessage,
  deleteGroupMessage,
  type ChatGroup,
  type ChatGroupMember,
  type ChatGroupMessage,
} from "@/hooks/useChatApi";
import { notify, notifyError } from "@/lib/i18n-toast";
import { getDateSeparatedMessageItems } from "@/lib/messageDateSeparators";
import { formatDate } from "@/lib/locale-format";
import { isThisYear, isToday, isYesterday } from "date-fns";

// Realtime drives live updates now; the poll is a reconnect-safety fallback.
// Kept tight (8s) so that if realtime drops on mobile the group still
// converges quickly — the previous 20s gap was a large part of the perceived
// "messages take half a minute to appear" complaint.
const POLL_INTERVAL_MS = 8000;

interface GroupWithMembers extends ChatGroup {
  members: ChatGroupMember[];
  member_count: number;
}

// Shape MessageBubble consumes. The gateway stores the text in
// chat_messages.content; MessageBubble reads `message.body` in most
// render branches (text, link preview, default), so we alias content
// to body. Attachment/voice payload lives in chat_messages.metadata;
// the bubble reads it as message.content_data.
interface BubbleMessage {
  id: string;
  sender_id: string;
  body: string;
  content: string;
  content_data: Record<string, unknown> | null;
  message_type: string;
  created_at: string;
  thread_id: string;
}

function toBubbleMessage(msg: ChatGroupMessage, groupId: string): BubbleMessage {
  return {
    id: msg.id,
    sender_id: msg.sender_id,
    body: msg.content,
    content: msg.content,
    content_data: (msg.metadata as Record<string, unknown>) || null,
    message_type: msg.message_type || "text",
    created_at: msg.created_at,
    thread_id: groupId,
  };
}

export default function GroupChat() {
  const { groupId, messageId: initialScrollMessageId } = useParams<{ groupId: string; messageId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate } = useTranslation();
  const userId = user?.id;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [messages, setMessages] = useState<ChatGroupMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, ChatGroupMember>();
    (group?.members || []).forEach(m => map.set(m.user_id, m));
    return map;
  }, [group]);

  const messageItems = useMemo(() => {
    return getDateSeparatedMessageItems(
      messages,
      msg => msg.created_at,
      messageDate => {
        if (isToday(messageDate)) return "Today";
        if (isYesterday(messageDate)) return "Yesterday";
        return isThisYear(messageDate)
          ? formatDate(messageDate, "d MMMM")
          : formatDate(messageDate, "d MMMM yyyy");
      },
    );
  }, [messages]);

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
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load group");
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

  // Realtime: new messages in this group push an immediate reload. Requires
  // public.chat_messages in the supabase_realtime publication
  // (migration 20260618110546).
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group_chat_${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `group_id=eq.${groupId}` },
        () => { reload(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, reload]);

  // Fallback poll — covers dropped realtime events / reconnects.
  useEffect(() => {
    const id = setInterval(() => { reload(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reload]);

  const hasScrolledToTargetRef = useRef(false);

  useEffect(() => {
    if (initialScrollMessageId) return; // reaction-notification deep-link wins instead
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, initialScrollMessageId]);

  // Reaction-notification deep-link: scroll to and highlight the reacted-to
  // message once it's rendered, instead of the default scroll-to-bottom.
  useEffect(() => {
    if (!initialScrollMessageId || hasScrolledToTargetRef.current || messages.length === 0) return;
    const el = document.getElementById(`msg-${initialScrollMessageId}`);
    if (!el) return; // not rendered yet — retry on next messages update
    hasScrolledToTargetRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("message-highlight");
    const timer = setTimeout(() => el.classList.remove("message-highlight"), 1500);
    return () => clearTimeout(timer);
  }, [initialScrollMessageId, messages]);

  // MessageInput.onSendMessage matches the DM signature so all of its
  // code paths (text, attachment, voice) plug into the chat_groups endpoint
  // unchanged. The gateway accepts message_type + content_data and stores
  // them in chat_messages.metadata.
  const handleSend = useCallback(async (
    content: string,
    messageType?: string,
    contentData?: Record<string, unknown> | null,
  ) => {
    if (!groupId || isSending) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatGroupMessage = {
      id: tempId,
      tenant_id: "",
      sender_id: userId || "",
      group_id: groupId,
      content,
      created_at: new Date().toISOString(),
      message_type: messageType || "text",
      metadata: contentData || undefined,
    };
    setMessages(prev => [...prev, optimistic]);
    setIsSending(true);
    try {
      const saved = await sendGroupMessage(groupId, content, {
        messageType,
        contentData: contentData || null,
      });
      setMessages(prev => prev.map(m => (m.id === tempId ? saved : m)));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setLoadError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  }, [groupId, isSending, userId]);

  // MessageBubble's edit ("correction") flow is a no-op unless onUpdateMessage
  // is supplied — see handleEditSave's `!onUpdateMessage` guard.
  const handleUpdateMessage = useCallback(async (messageId: string, updates: any) => {
    if (!groupId) return;
    const content = String(updates?.body ?? updates?.content ?? "").trim();
    if (!content) return;
    try {
      const saved = await updateGroupMessage(groupId, messageId, content);
      setMessages(prev => prev.map(m => (m.id === messageId ? saved : m)));
    } catch (err) {
      notifyError('toasts.messages.updateFailed', 'toasts.messages.failedUpdateMessagePleaseTryAgain');
      throw err;
    }
  }, [groupId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!groupId) return;
    try {
      await deleteGroupMessage(groupId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      notify('toasts.messages.messageDeleted');
    } catch (err) {
      notifyError('toasts.messages.deleteFailed', 'toasts.messages.failedDeleteMessagePleaseTryAgain');
      throw err;
    }
  }, [groupId]);

  const goBack = useCallback(() => {
    navigate("/inbox", { replace: true });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">{translate("inbox.group.loading")}</div>
      </div>
    );
  }

  if (loadError && !group) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-2 font-medium">{translate("inbox.group.cantOpen")}</div>
          <div className="mb-4 text-sm text-red-600">{loadError}</div>
          <button
            className="rounded bg-gray-100 px-4 py-2 text-sm"
            onClick={goBack}
          >{translate("inbox.group.backToInbox")}</button>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const memberLabel = group.member_count === 1
    ? translate("inbox.group.memberOne")
    : translate("inbox.group.memberOther");

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          aria-label={translate("inbox.group.back")}
          className="rounded p-2 hover:bg-gray-100"
          onClick={goBack}
        >←</button>
        {typeof (group.metadata as Record<string, unknown> | null)?.avatar_url === "string" && (
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={String((group.metadata as Record<string, unknown>).avatar_url)}
              alt={group.name}
              className="object-cover"
            />
            <AvatarFallback>{group.name?.[0] ?? "#"}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <div className="font-semibold leading-tight">{group.name}</div>
          <div className="text-xs text-gray-500">
            {group.member_count} {memberLabel}
            {group.is_system ? ` · ${translate("inbox.group.officialBadge")}` : ""}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-gray-500">
            {translate("inbox.group.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {messageItems.map(item => {
              if (item.type === "date") {
                return (
                  <MessageDivider
                    key={item.id}
                    type="date"
                    text={item.text}
                  />
                );
              }

              const msg = item.message;
              const isOwn = msg.sender_id === userId;
              const sender = memberById.get(msg.sender_id);
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500">
                  <MessageBubble
                    message={{
                      ...toBubbleMessage(msg, group.id),
                      sender: sender
                        ? {
                            user_id: sender.user_id,
                            display_name: sender.display_name,
                            avatar_url: sender.avatar_url,
                          }
                        : null,
                    }}
                    isOwnMessage={isOwn}
                    showAvatar={!isOwn}
                    onUpdateMessage={handleUpdateMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div ref={streamEndRef} />
      </main>

      <footer className="sticky bottom-0 border-t bg-white px-2 py-2">
        <MessageInput
          threadId={group.id}
          activeThread={{ id: group.id, type: "group" }}
          conversationType="group"
          onSendMessage={handleSend}
          isSending={isSending}
          placeholder={translate("inbox.group.composerPlaceholder")}
        />
      </footer>
    </div>
  );
}
