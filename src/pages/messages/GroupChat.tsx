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
import { realtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';
import { useTranslation } from "@/hooks/useTranslation";
import { newClientMessageId, tempIdFor, reconcileByClientId } from "@/lib/messaging/outbox";
import { useJumpToMessage, unionByIdSorted, bridgeWindow } from "@/hooks/useJumpToMessage";
import { useChatViewingPresence } from "@/hooks/useChatViewingPresence";
import MessageInput from "@/components/messages/MessageInput";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageDivider from "@/components/messages/MessageDivider";
import NewMessagesPill from "@/components/messages/NewMessagesPill";
import { useChatScrollAnchor, distanceFromBottom, NEAR_BOTTOM_PX } from "@/hooks/useChatScrollAnchor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchGroupMessagesAround,
  fetchGroupMessagesAfter,
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
import type { MentionCandidate } from "@/hooks/useMentionCandidates";
import { getDateSeparatedMessageItems } from "@/lib/messageDateSeparators";
import { groupPositions, isGroupStart, type GroupPosition } from "@/lib/messaging/grouping";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/locale-format";
import { isThisYear, isToday, isYesterday } from "date-fns";
import { MessageSquareOff } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { messagesNavigation } from "@/config/navigation";
import { SpotlightEmpty, SpotlightRowsSkeleton } from "@/components/spotlight/member/MemberSpotlight";

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
  /** VTID-05320: local send state (sending | failed) and its idempotency key. */
  send_status?: "sending" | "failed";
  client_message_id?: string | null;
  reply_to_message_id?: string | null;
}

/** VTID-05320: a group row as kept on this screen — server rows plus local unsent ones. */
type GroupRow = ChatGroupMessage & { send_status?: "sending" | "failed" };

function toBubbleMessage(msg: GroupRow, groupId: string): BubbleMessage {
  return {
    id: msg.id,
    sender_id: msg.sender_id,
    body: msg.content,
    content: msg.content,
    content_data: (msg.metadata as Record<string, unknown>) || null,
    message_type: msg.message_type || "text",
    created_at: msg.created_at,
    thread_id: groupId,
    send_status: msg.send_status,
    client_message_id: msg.client_message_id ?? null,
    reply_to_message_id: msg.reply_to_message_id ?? null,
  };
}

/**
 * VTID-05320: a refetch replaces the server rows but keeps this screen's
 * unsent rows (sending | failed) unless their client_message_id arrived.
 */
export function mergeGroupRows(prev: GroupRow[], server: GroupRow[]): GroupRow[] {
  const arrived = new Set(server.map((m) => m.client_message_id).filter(Boolean) as string[]);
  const local = prev.filter((m) => m.send_status && !(m.client_message_id && arrived.has(m.client_message_id)));
  return local.length === 0 ? server : [...server, ...local];
}

// VTID-04928: engines without scrollIntoView (jsdom) must never crash the page.
function intoView(el: Element | null, opts: ScrollIntoViewOptions) {
  if (el && typeof el.scrollIntoView === "function") el.scrollIntoView(opts);
}

export default function GroupChat() {
  const { groupId, messageId: initialScrollMessageId } = useParams<{ groupId: string; messageId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { translate } = useTranslation();
  const userId = user?.id;
  // VTID-05117 — Spotlight (desktop + flag): the thread opens inside the Vitanaland frame
  // (sidebar + Inbox sections) on the conversation archetype; phones and flag-off keep the
  // full-screen chat below. Same refs, same pinning/scroll logic, same composer.
  const spotlight = useSpotlightEnabled();

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [messages, setMessages] = useState<GroupRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  // VTID-05320: sends no longer block each other; kept for the composer props.
  const [isSending] = useState(false);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, ChatGroupMember>();
    (group?.members || []).forEach(m => map.set(m.user_id, m));
    return map;
  }, [group]);

  // VTID-04926: who can be @mentioned here — the roster minus yourself, the
  // Vitana bot and accounts the gateway marks as not mentionable.
  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    return (group?.members || [])
      .filter(m => m.user_id !== userId && !m.is_bot && m.mentionable !== false && !!m.display_name?.trim())
      .map(m => ({ user_id: m.user_id, display_name: m.display_name!.trim(), avatar_url: m.avatar_url }));
  }, [group, userId]);

  // VTID-05318: rows loaded around a jump target, shown with the latest page
  // (kept apart so the 8 s refresh of the latest page never drops them).
  const [jumpRows, setJumpRows] = useState<GroupRow[]>([]);
  useEffect(() => { setJumpRows([]); }, [groupId]);
  const shownMessages = useMemo(
    () => (jumpRows.length > 0 ? unionByIdSorted(messages, jumpRows) : messages),
    [messages, jumpRows]
  );
  // Replied-to messages that are not loaded: fetched once each (null = gone).
  const [fetchedParents, setFetchedParents] = useState<Record<string, GroupRow | null | undefined>>({});
  const currentGroupRef = useRef<string | undefined>(groupId);
  currentGroupRef.current = groupId;
  const [replyingTo, setReplyingTo] = useState<Record<string, unknown> | null>(null);

  const messageItems = useMemo(() => {
    return getDateSeparatedMessageItems(
      shownMessages,
      msg => msg.created_at,
      messageDate => {
        if (isToday(messageDate)) return translate("inbox.group.today");
        if (isYesterday(messageDate)) return translate("inbox.group.yesterday");
        return isThisYear(messageDate)
          ? formatDate(messageDate, "d MMMM")
          : formatDate(messageDate, "d MMMM yyyy");
      },
    );
  }, [shownMessages, translate]);

  // VTID-05314: one sender's messages within 5 min of each other form a group.
  const groupPositionById = useMemo(() => {
    const positions = groupPositions(shownMessages);
    return new Map<string, GroupPosition>(shownMessages.map((m, i) => [m.id, positions[i]]));
  }, [shownMessages]);
  // 2 px inside a group, 8 px between groups and around day dividers.
  const itemGapClass = (index: number, position?: GroupPosition) =>
    index === 0 ? undefined : position && !isGroupStart(position) ? "mt-0.5" : "mt-2";

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const msgs = await fetchGroupMessages(groupId, 100);
      setMessages(prev => mergeGroupRows(prev, msgs.slice().reverse()));
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
    const channel = realtimeChannel(`group_chat_${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `group_id=eq.${groupId}` },
        () => { loadMessages(); },
      )
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
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
    intoView(pageEndRef.current, { block: "end", behavior: smooth ? "smooth" : "auto" });
  }, []);

  const applyPin = useCallback(() => {
    if (!pinnedRef.current) return;
    const target = pinTargetRef.current;
    if (target) {
      const el = document.getElementById(`msg-${target}`);
      if (el) {
        intoView(el, { block: "center", behavior: "auto" });
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

  // While still pinned (the member has not touched the screen yet) a new
  // message re-applies the pin, as before.
  useLayoutEffect(() => {
    if (!ready) return;
    if (prevMessageCountRef.current > 0 && messages.length > prevMessageCountRef.current && pinnedRef.current) {
      applyPin();
    }
    prevMessageCountRef.current = messages.length;
  }, [ready, messages.length, applyPin]);

  // VTID-05319: after that, new messages no longer drag the member down while
  // they read earlier ones (this used to smooth-scroll to the bottom on every
  // message). At the bottom the view follows; otherwise "↓ N new messages".
  // Either <main> or the document scrolls (VTID-04928), so measure both.
  const groupIsAtBottom = useCallback(() => {
    const main = mainRef.current;
    if (main && main.scrollHeight > main.clientHeight + 1) return distanceFromBottom(main) <= NEAR_BOTTOM_PX;
    const doc = document.scrollingElement || document.documentElement;
    return distanceFromBottom({
      scrollHeight: doc.scrollHeight,
      scrollTop: window.scrollY || doc.scrollTop,
      clientHeight: window.innerHeight,
    }) <= NEAR_BOTTOM_PX;
  }, []);
  const followGroupNewest = useCallback(() => scrollToBottom(false), [scrollToBottom]);
  const newestGroupRow = messages.length > 0 ? messages[messages.length - 1] : null;
  const scrollAnchor = useChatScrollAnchor({
    conversationKey: groupId ?? null,
    newest: newestGroupRow ? { id: newestGroupRow.id, sender_id: newestGroupRow.sender_id } : null,
    meId: userId,
    isAtBottom: groupIsAtBottom,
    follow: followGroupNewest,
    enabled: ready,
  });
  const { onScroll: onGroupScroll, markAway: markGroupAway } = scrollAnchor;
  // Opened on a deep-linked message: that is not "the bottom".
  useLayoutEffect(() => {
    if (initialScrollMessageId) markGroupAway();
  }, [groupId, initialScrollMessageId, markGroupAway]);
  useEffect(() => {
    if (!ready) return;
    const main = mainRef.current;
    main?.addEventListener("scroll", onGroupScroll, { passive: true });
    window.addEventListener("scroll", onGroupScroll, { passive: true });
    return () => {
      main?.removeEventListener("scroll", onGroupScroll);
      window.removeEventListener("scroll", onGroupScroll);
    };
  }, [ready, onGroupScroll]);

  // MessageInput.onSendMessage matches the DM signature so all of its
  // code paths (text, attachment, voice) plug into the chat_groups endpoint
  // unchanged. The gateway accepts message_type + content_data and stores
  // them in chat_messages.metadata.
  // VTID-05320: every send has a client_message_id. The row shows at once
  // (Sending), becomes the server row on success (matched by that id), and on
  // failure stays as "Not sent" with Retry — the retry re-posts the same id,
  // which the gateway dedups. Sends no longer wait for each other.
  const deliverGroupRow = useCallback(async (row: GroupRow) => {
    if (!groupId || !row.client_message_id) return;
    const cid = row.client_message_id;
    setMessages(prev => prev.map(m => (m.client_message_id === cid && m.send_status ? { ...m, send_status: "sending" } : m)));
    try {
      // A send that does not answer in 20 s fails, so the next one can go.
      const saved = await Promise.race([
        sendGroupMessage(groupId, row.content, {
          messageType: row.message_type,
          contentData: (row.metadata as Record<string, unknown>) || null,
          clientMessageId: cid,
          replyToMessageId: row.reply_to_message_id ?? null,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("send_timeout")), 20_000)),
      ]);
      const { duplicate: _dup, ...stored } = saved;
      setMessages(prev => reconcileByClientId(prev, { ...stored, client_message_id: stored.client_message_id ?? cid }, cid));
    } catch (err) {
      console.warn("[GroupChat] send failed:", err);
      setMessages(prev => prev.map(m => (m.client_message_id === cid && m.send_status ? { ...m, send_status: "failed" } : m)));
    }
  }, [groupId]);

  // One send at a time, in send order; a second tap on Retry while the same
  // message is queued or in flight does nothing.
  const groupChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const groupQueuedRef = useRef<Set<string>>(new Set());
  const enqueueGroupRow = useCallback((row: GroupRow) => {
    const cid = row.client_message_id;
    if (!cid || groupQueuedRef.current.has(cid)) return;
    groupQueuedRef.current.add(cid);
    groupChainRef.current = groupChainRef.current
      .catch(() => undefined)
      .then(() => deliverGroupRow(row))
      .finally(() => groupQueuedRef.current.delete(cid));
  }, [deliverGroupRow]);

  const handleSend = useCallback(async (
    content: string,
    messageType?: string,
    contentData?: Record<string, unknown> | null,
    _actionButtons?: unknown,
    parentMessageId?: string,
  ) => {
    if (!groupId) return;
    const cid = newClientMessageId();
    const optimistic: GroupRow = {
      id: tempIdFor(cid),
      tenant_id: "",
      sender_id: userId || "",
      group_id: groupId,
      content,
      created_at: new Date().toISOString(),
      message_type: messageType || "text",
      metadata: contentData || undefined,
      client_message_id: cid,
      reply_to_message_id: parentMessageId && !parentMessageId.startsWith("temp-") ? parentMessageId : null,
      send_status: "sending",
    };
    setMessages(prev => [...prev, optimistic]);
    setReplyingTo(null);
    enqueueGroupRow(optimistic);
  }, [groupId, userId, enqueueGroupRow]);

  const loadAround = useCallback(async (messageId: string): Promise<boolean> => {
    if (!groupId) return false;
    const win = await fetchGroupMessagesAround(groupId, messageId, 40);
    if (!win || win.data.length === 0) return false;
    const bridged = await bridgeWindow(win.data as GroupRow[], win.has_newer, messages, (after) => fetchGroupMessagesAfter(groupId, after, 100) as Promise<GroupRow[]>);
    setJumpRows((prev) => unionByIdSorted(prev, bridged));
    return true;
  }, [groupId, messages]);
  const jumpToMessage = useJumpToMessage({ loadAround, onJump: markGroupAway });
  // VTID-05322: while this group is on screen, no push for it (gateway VTID-05312).
  useChatViewingPresence(groupId ? `group:${groupId}` : null);
  const rowById = useMemo(() => new Map(shownMessages.map((m) => [m.id, m])), [shownMessages]);
  const bubbleParentProps = (msg: GroupRow) => {
    const pid = msg.reply_to_message_id;
    if (!pid) return {};
    const parentRow = rowById.get(pid) ?? fetchedParents[pid] ?? null;
    const parentSender = parentRow ? memberById.get(parentRow.sender_id) : undefined;
    return {
      parentMessage: parentRow && groupId
        ? { ...toBubbleMessage(parentRow, groupId), sender: parentSender ? { user_id: parentSender.user_id, display_name: parentSender.display_name, avatar_url: parentSender.avatar_url } : null }
        : null,
      parentUnavailable: !parentRow && fetchedParents[pid] === null,
    };
  };
  const handleReply = useCallback((bubbleMessage: Record<string, unknown>) => {
    if (String(bubbleMessage.id ?? '').startsWith('temp-')) return;
    setReplyingTo(bubbleMessage);
  }, []);
  const handleJump = useCallback((messageId: string) => { void jumpToMessage(messageId); }, [jumpToMessage]);

  useEffect(() => {
    if (!groupId) return;
    const known = new Set(shownMessages.map((m) => m.id));
    const missing = Array.from(new Set(
      shownMessages
        .map((m) => m.reply_to_message_id)
        .filter((id): id is string => !!id && !known.has(id) && !(id in fetchedParents))
    )).slice(0, 10);
    if (missing.length === 0) return;
    const forGroup = groupId;
    const stillHere = () => currentGroupRef.current === forGroup;
    setFetchedParents((prev) => ({ ...prev, ...Object.fromEntries(missing.map((id) => [id, undefined])) }));
    (async () => {
      for (const id of missing) {
        try {
          const win = await fetchGroupMessagesAround(forGroup, id, 2);
          const row = win?.data.find((r) => r.id === id) as GroupRow | undefined;
          if (stillHere()) setFetchedParents((prev) => ({ ...prev, [id]: row ?? null }));
        } catch {
          if (stillHere()) setFetchedParents((prev) => ({ ...prev, [id]: null }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchedParents is read as a guard only
  }, [shownMessages, groupId]);

  const handleRetry = useCallback((cid: string) => {
    const row = messages.find(m => m.client_message_id === cid && m.send_status === "failed");
    if (row) enqueueGroupRow(row);
  }, [messages, enqueueGroupRow]);

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
    // VTID-05320: an unsent message exists only here — discard it locally.
    if (messageId.startsWith("temp-")) {
      const cid = messageId.slice("temp-".length);
      if (!groupQueuedRef.current.has(cid)) setMessages(prev => prev.filter(m => m.id !== messageId));
      return;
    }
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

  if (spotlight) {
    const loaded = !!group && !(loadError && !messagesLoaded) && !isLoading;
    const failed = !!loadError && (!group || !messagesLoaded);
    const groupAvatar = (group?.metadata as Record<string, unknown> | null)?.avatar_url;
    return (
      <AppLayout>
        <ScreenFrame
          archetype="conversation"
          subNav={{ items: messagesNavigation }}
          header={
            group && loaded
              ? {
                  title: group.name,
                  description: `${group.member_count} ${group.member_count === 1 ? translate("inbox.group.memberOne") : translate("inbox.group.memberOther")}${group.is_system ? ` · ${translate("inbox.group.officialBadge")}` : ""}`,
                }
              : undefined
          }
        >
          <div className="mx-auto flex w-full max-w-wide flex-col" data-group-thread="">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                data-testid="group-chat-back"
                aria-label={translate("inbox.group.back")}
                className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted active:bg-muted"
                onClick={goBack}
              >
                <ArrowLeft className="size-6 rtl:rotate-180" aria-hidden="true" />
              </button>
              {group && typeof groupAvatar === "string" && (
                <Avatar className="size-9">
                  <AvatarImage src={groupAvatar} alt={group.name} className="object-cover" />
                  <AvatarFallback>{group.name?.[0] ?? "#"}</AvatarFallback>
                </Avatar>
              )}
            </div>
            {failed ? (
              <SpotlightEmpty Icon={MessageSquareOff} titleKey="inbox.group.cantOpen" actionKey="inbox.group.backToInbox" onAction={goBack} />
            ) : !loaded || !group ? (
              <SpotlightRowsSkeleton count={6} />
            ) : (
              <section className="flex flex-col rounded-vcard border bg-card shadow-vcard">
                <main ref={mainRef} className="px-4 py-4">
                  <div ref={contentRef}>
                    {messages.length === 0 ? (
                      <div className="mt-10 text-center text-sm text-muted-foreground">{translate("inbox.group.empty")}</div>
                    ) : (
                      <div className="flex flex-col">
                        {messageItems.map((item, index) => {
                          if (item.type === "date") {
                            return (
                              <div key={item.id} className={itemGapClass(index)}>
                                <MessageDivider type="date" text={item.text} />
                              </div>
                            );
                          }
                          const msg = item.message;
                          const isOwn = msg.sender_id === userId;
                          const sender = memberById.get(msg.sender_id);
                          const groupPosition = groupPositionById.get(msg.id);
                          return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={cn("transition-colors duration-150", itemGapClass(index, groupPosition))}>
                              <MessageBubble
                                message={{
                                  ...toBubbleMessage(msg, group.id),
                                  sender: sender
                                    ? { user_id: sender.user_id, display_name: sender.display_name, avatar_url: sender.avatar_url }
                                    : null,
                                }}
                                isOwnMessage={isOwn}
                                showAvatar={!isOwn}
                                groupPosition={groupPosition}
                                onUpdateMessage={handleUpdateMessage}
                                onDeleteMessage={handleDeleteMessage}
                                onRetry={handleRetry}
                                onReply={handleReply}
                                onScrollToMessage={handleJump}
                                {...bubbleParentProps(msg)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={streamEndRef} />
                  </div>
                </main>
                <footer className="sticky bottom-0 rounded-b-vcard border-t bg-card px-2 pb-2 pt-2">
                  <NewMessagesPill count={scrollAnchor.newCount} onClick={scrollAnchor.jumpToLatest} style={{ bottom: "calc(100% + 8px)" }} />
                  <MessageInput
                    threadId={group.id}
                    activeThread={{ id: group.id, type: "group" }}
                    conversationType="group"
                    onSendMessage={handleSend}
                    isSending={isSending}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    placeholder={translate("inbox.group.composerPlaceholder")}
                    mentionCandidates={mentionCandidates}
                  />
                </footer>
                <div ref={pageEndRef} aria-hidden="true" />
              </section>
            )}
          </div>
        </ScreenFrame>
      </AppLayout>
    );
  }

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
          <div className="flex flex-col">
            {messageItems.map((item, index) => {
              if (item.type === "date") {
                return (
                  <div key={item.id} className={itemGapClass(index)}>
                    <MessageDivider type="date" text={item.text} />
                  </div>
                );
              }

              const msg = item.message;
              const isOwn = msg.sender_id === userId;
              const sender = memberById.get(msg.sender_id);
              const groupPosition = groupPositionById.get(msg.id);
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={cn("transition-colors duration-500", itemGapClass(index, groupPosition))}>
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
                    groupPosition={groupPosition}
                    onUpdateMessage={handleUpdateMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onRetry={handleRetry}
                    onReply={handleReply}
                    onScrollToMessage={handleJump}
                    {...bubbleParentProps(msg)}
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
        <NewMessagesPill count={scrollAnchor.newCount} onClick={scrollAnchor.jumpToLatest} style={{ bottom: "calc(100% + 8px)" }} />
        <MessageInput
          threadId={group.id}
          activeThread={{ id: group.id, type: "group" }}
          conversationType="group"
          onSendMessage={handleSend}
          isSending={isSending}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          placeholder={translate("inbox.group.composerPlaceholder")}
          mentionCandidates={mentionCandidates}
        />
      </footer>
      {/* VTID-04928: end of the page, below the sticky composer — scrolled into
          view so the newest message sits just above the composer whichever
          element scrolls. */}
      <div ref={pageEndRef} aria-hidden="true" />
    </div>
  );
}
