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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
// VTID-04901: the poll and realtime refresh MESSAGES only. The group itself
// (with every member's profile) is loaded on open and when the app returns
// to the foreground — for "Alle Beisammen" (every member) re-fetching the
// roster every 8s kept the screen slow and stuck on the loading state.
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
  const location = useLocation();
  const { user } = useAuth();
  const { translate } = useTranslation();
  const userId = user?.id;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [messages, setMessages] = useState<ChatGroupMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

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
        if (isToday(messageDate)) return translate("inbox.group.today");
        if (isYesterday(messageDate)) return translate("inbox.group.yesterday");
        return isThisYear(messageDate)
          ? formatDate(messageDate, "d MMMM")
          : formatDate(messageDate, "d MMMM yyyy");
      },
    );
  }, [messages, translate]);

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const msgs = await fetchGroupMessages(groupId, 100);
      setMessages(msgs.slice().reverse());
      setMessagesLoaded(true);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load group");
    }
  }, [groupId]);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const g = await fetchGroup(groupId);
      setGroup(g);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load group");
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMessagesLoaded(false);
    Promise.all([loadGroup(), loadMessages()]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadGroup, loadMessages]);

  // Refresh the roster (names/avatars, member count) when the app comes back
  // to the foreground instead of on every poll tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadGroup();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadGroup]);

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
        () => { loadMessages(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, loadMessages]);

  // Fallback poll — covers dropped realtime events / reconnects.
  useEffect(() => {
    const id = setInterval(() => { loadMessages(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadMessages]);

  // VTID-04928: where the view rests. "bottom" = the newest message (a normal
  // open, WhatsApp style); a message id = the message a push notification or a
  // reaction deep link points at (/inbox/g/:groupId/msg/:messageId).
  //
  // VTID-04921 set `main.scrollTop` only. In the Android app (Appilix webview)
  // the DOCUMENT can be what scrolls instead of <main>, and then that jump does
  // nothing — every open and every push tap landed on the oldest message. So
  // scrolling here never assumes which element scrolls: it moves <main> AND
  // brings the page's end marker (after the sticky composer) into view, which
  // scrolls whatever ancestor actually scrolls.
  //
  // The view stays pinned to its target while late content lays out (images,
  // avatars, signed URLs grow the list after the first paint) until the member
  // touches or wheels the screen; then they scroll freely.
  const pinnedRef = useRef(true);
  const pinTargetRef = useRef<string | null>(null);
  const highlightedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const ready = !isLoading && group?.id === groupId && messagesLoaded;

  const scrollToBottom = useCallback((smooth: boolean) => {
    const main = mainRef.current;
    if (main) {
      if (smooth && typeof main.scrollTo === "function") {
        main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
      } else {
        main.scrollTop = main.scrollHeight;
      }
    }
    pageEndRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
  }, []);

  const applyPin = useCallback(() => {
    if (!pinnedRef.current) return;
    const target = pinTargetRef.current;
    if (target) {
      const el = document.getElementById(`msg-${target}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        if (!highlightedRef.current) {
          highlightedRef.current = true;
          el.classList.add("message-highlight");
          setTimeout(() => el.classList.remove("message-highlight"), 1500);
        }
        return;
      }
      // The target is not in the loaded page (older than the latest 100):
      // open at the newest message, never at the top.
      pinTargetRef.current = null;
    }
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Every new group or new target starts pinned again.
  useLayoutEffect(() => {
    pinnedRef.current = true;
    pinTargetRef.current = initialScrollMessageId ?? null;
    highlightedRef.current = false;
    prevMessageCountRef.current = 0;
  }, [groupId, initialScrollMessageId]);

  // Pin once the list is on screen; re-apply while it grows; release on the
  // member's first touch/wheel. Cleaned up on unmount and on group/target change.
  useLayoutEffect(() => {
    if (!ready) return;
    applyPin();
    const raf = requestAnimationFrame(applyPin);
    const content = contentRef.current;
    const observer = typeof ResizeObserver !== "undefined" && content
      ? new ResizeObserver(() => applyPin())
      : null;
    if (observer && content) observer.observe(content);
    const release = () => { pinnedRef.current = false; };
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("wheel", release, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("touchstart", release);
      window.removeEventListener("wheel", release);
    };
  }, [ready, groupId, initialScrollMessageId, applyPin]);

  // New messages after the member has scrolled: follow them down, as before.
  useLayoutEffect(() => {
    if (!ready) return;
    if (prevMessageCountRef.current > 0 && messages.length > prevMessageCountRef.current) {
      if (pinnedRef.current) applyPin();
      else scrollToBottom(true);
    }
    prevMessageCountRef.current = messages.length;
  }, [ready, messages.length, applyPin, scrollToBottom]);

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
  const handleUpdateMessage = useCallback(async (messageId: string, updates: { body?: string; content?: string }) => {
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

  // VTID-04901: opened from the inbox list (which marks the navigation) →
  // history back to it, so the hardware back button doesn't land on a second
  // /inbox entry. Anything else — a push-notification deep link, a cold start,
  // a return from sign-in/onboarding — replaces this screen with the inbox,
  // never "back" into a login or onboarding step.
  const openedFromInbox = (location.state as { fromInbox?: boolean } | null)?.fromInbox === true;
  const goBack = useCallback(() => {
    if (openedFromInbox) {
      navigate(-1);
    } else {
      navigate("/inbox", { replace: true });
    }
  }, [openedFromInbox, navigate]);

  // The exit is ALWAYS on screen — loading, error and loaded states alike —
  // and sits below the status bar / notch (`viewport-fit=cover` draws the app
  // under it; same inset ConversationView's header uses).
  const backButton = (
    <button
      type="button"
      data-testid="group-chat-back"
      aria-label={translate("inbox.group.back")}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
      onClick={goBack}
    >
      <ArrowLeft className="h-6 w-6 rtl:rotate-180" aria-hidden="true" />
    </button>
  );
  const headerClassName = "sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-2 pb-2";
  const headerStyle = { paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" };

  if (isLoading || (!group && !loadError)) {
    return (
      <div className="flex h-[100dvh] flex-col bg-white">
        <header className={headerClassName} style={headerStyle}>
          {backButton}
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-gray-500">{translate("inbox.group.loading")}</div>
        </div>
      </div>
    );
  }

  // The group loaded but its messages did not: show the error, never a false
  // "no messages yet".
  if (loadError && (!group || !messagesLoaded)) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center p-6">
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
    <div className="flex h-[100dvh] flex-col bg-white">
      <header className={headerClassName} style={headerStyle}>
        {backButton}
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
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{group.name}</div>
          <div className="text-xs text-gray-500">
            {group.member_count} {memberLabel}
            {group.is_system ? ` · ${translate("inbox.group.officialBadge")}` : ""}
          </div>
        </div>
      </header>

      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div ref={contentRef}>
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
        </div>
      </main>

      <footer
        className="sticky bottom-0 border-t bg-white px-2 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        <MessageInput
          threadId={group.id}
          activeThread={{ id: group.id, type: "group" }}
          conversationType="group"
          onSendMessage={handleSend}
          isSending={isSending}
          placeholder={translate("inbox.group.composerPlaceholder")}
        />
      </footer>
      {/* VTID-04928: end of the page, below the sticky composer — scrolled into
          view so the newest message sits just above the composer whichever
          element scrolls. */}
      <div ref={pageEndRef} aria-hidden="true" />
    </div>
  );
}
