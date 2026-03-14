import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";
import { messageCache } from "./messageCache";
import {
  persistThreads,
  getCachedThreads,
  persistMessages,
  getCachedMessages,
} from "./chatPersistCache";
import {
  fetchConversations,
  fetchConversation,
  sendChatMessage,
  markChatRead,
  type ChatMessage,
  type ChatConversation,
} from "./useChatApi";
import type { MessageKind, SendMessageArgs } from "./useHybridMessages";

// ── Public types (unchanged – the UI depends on these) ───────────────

export interface GlobalMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data?: any;
  created_at: string;
  updated_at: string;
  sender?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

export interface GlobalMessageThread {
  id: string;
  name?: string;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
    role: string;
    last_read_at?: string;
  }[];
  last_message?: GlobalMessage;
  unread_count: number;
}

const STALE_TIME = 10 * 60 * 1000;  // 10 minutes
const GC_TIME = 30 * 60 * 1000;     // 30 minutes

// ── Helpers ──────────────────────────────────────────────────────────

/** Map a gateway ChatMessage → GlobalMessage the UI understands */
function toGlobalMessage(
  msg: ChatMessage & { message_type?: string; content_data?: any },
  peerId: string,
  profileMap: Record<string, { display_name: string; avatar_url: string | null }>
): GlobalMessage {
  return {
    id: msg.id,
    thread_id: peerId,
    sender_id: msg.sender_id,
    body: msg.content,
    message_type: (msg as any).message_type || "text",
    content_data: (msg as any).metadata || undefined,
    created_at: msg.created_at,
    updated_at: msg.created_at,
    sender: profileMap[msg.sender_id]
      ? { user_id: msg.sender_id, ...profileMap[msg.sender_id] }
      : null,
  };
}

/** Fetch profiles from Supabase for a set of user IDs */
async function enrichProfiles(
  userIds: string[]
): Promise<Record<string, { display_name: string; avatar_url: string | null }>> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return {};

  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    supabase
      .from("global_community_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", ids),
    supabase
      .from("profiles")
      .select("user_id, display_name, full_name, avatar_url")
      .in("user_id", ids),
  ]);

  const map: Record<string, { display_name: string; avatar_url: string | null }> = {};
  ids.forEach((uid) => {
    const gp = globalProfiles?.find((p) => p.user_id === uid);
    const mp = mainProfiles?.find((p) => p.user_id === uid);
    map[uid] = {
      display_name:
        gp?.display_name || mp?.display_name || mp?.full_name || "Unknown User",
      avatar_url: gp?.avatar_url || mp?.avatar_url || null,
    };
  });
  return map;
}

// ── Legacy Supabase fallback ─────────────────────────────────────────

/**
 * Fetch threads from legacy global_message_threads + global_thread_participants.
 * Uses the other participant's user_id as thread id (same as gateway peer_id)
 * so legacy direct threads naturally dedup with gateway threads.
 */
async function fetchLegacyThreads(userId: string): Promise<GlobalMessageThread[]> {
  try {
    // 1. Get threads the user participates in
    const { data: participations, error: partErr } = await supabase
      .from("global_thread_participants")
      .select("thread_id, role, last_read_at")
      .eq("user_id", userId) as any;

    if (partErr || !participations || participations.length === 0) {
      if (partErr) console.warn("Legacy threads fallback failed (participants):", partErr.message);
      return [];
    }

    const threadIds = participations.map((p: any) => p.thread_id);

    // 2. Get thread metadata
    const { data: threadRows, error: threadErr } = await supabase
      .from("global_message_threads")
      .select("id, name, type, created_by, created_at, updated_at")
      .in("id", threadIds)
      .order("updated_at", { ascending: false }) as any;

    if (threadErr || !threadRows) {
      console.warn("Legacy threads fallback failed (threads):", threadErr?.message);
      return [];
    }

    // 3. Get all participants for these threads
    const { data: allParticipants } = await supabase
      .from("global_thread_participants")
      .select("thread_id, user_id, role, last_read_at")
      .in("thread_id", threadIds) as any;

    // 4. Get last message per thread
    const { data: lastMessages } = await supabase
      .from("global_messages")
      .select("id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }) as any;

    // Group last messages by thread (take first per thread = most recent)
    const lastMsgByThread: Record<string, any> = {};
    (lastMessages || []).forEach((m: any) => {
      if (!lastMsgByThread[m.thread_id]) lastMsgByThread[m.thread_id] = m;
    });

    // Collect all user IDs for profile enrichment
    const allUserIds = new Set<string>([userId]);
    (allParticipants || []).forEach((p: any) => allUserIds.add(p.user_id));
    Object.values(lastMsgByThread).forEach((m: any) => allUserIds.add(m.sender_id));

    const profileMap = await enrichProfiles(Array.from(allUserIds));

    // 5. Build GlobalMessageThread objects
    return threadRows
      .map((t: any) => {
        const threadParticipants = (allParticipants || []).filter(
          (p: any) => p.thread_id === t.id
        );

        // For group threads, use thread id directly
        if (t.type === 'group') {
          const enrichedParticipants = threadParticipants.map((p: any) => ({
            user_id: p.user_id,
            display_name: profileMap[p.user_id]?.display_name || "Unknown",
            avatar_url: profileMap[p.user_id]?.avatar_url || null,
            role: p.role || "member",
            last_read_at: p.last_read_at,
          }));

          const lastMsg = lastMsgByThread[t.id];
          const lastMessage: GlobalMessage | undefined = lastMsg
            ? {
                id: lastMsg.id,
                thread_id: t.id,
                sender_id: lastMsg.sender_id,
                body: lastMsg.body,
                message_type: lastMsg.message_type || "text",
                content_data: lastMsg.content_data,
                created_at: lastMsg.created_at,
                updated_at: lastMsg.updated_at || lastMsg.created_at,
                sender: profileMap[lastMsg.sender_id]
                  ? { user_id: lastMsg.sender_id, ...profileMap[lastMsg.sender_id] }
                  : null,
              }
            : undefined;

          const myParticipation = participations.find(
            (p: any) => p.thread_id === t.id
          );
          const unreadCount =
            lastMsg && myParticipation?.last_read_at
              ? new Date(lastMsg.created_at) > new Date(myParticipation.last_read_at)
                ? 1
                : 0
              : lastMsg && lastMsg.sender_id !== userId
              ? 1
              : 0;

          return {
            id: t.id,
            name: t.name,
            type: "group" as const,
            created_by: t.created_by,
            created_at: t.created_at,
            updated_at: lastMsg?.created_at || t.updated_at,
            participants: enrichedParticipants,
            last_message: lastMessage,
            unread_count: unreadCount,
            _legacyThreadId: t.id,
            _metadata: t.metadata,
          } as GlobalMessageThread & { _legacyThreadId: string; _metadata?: any };
        }

        // Direct threads: use peer user_id as thread id
        const otherParticipant = threadParticipants.find(
          (p: any) => p.user_id !== userId
        );

        // Use peer user_id as thread id (matches gateway convention)
        const peerId = otherParticipant?.user_id;
        if (!peerId) return null; // skip threads with no other participant

        const enrichedParticipants = threadParticipants.map((p: any) => ({
          user_id: p.user_id,
          display_name: profileMap[p.user_id]?.display_name || "Unknown",
          avatar_url: profileMap[p.user_id]?.avatar_url || null,
          role: p.role || "member",
          last_read_at: p.last_read_at,
        }));

        const lastMsg = lastMsgByThread[t.id];
        const lastMessage: GlobalMessage | undefined = lastMsg
          ? {
              id: lastMsg.id,
              thread_id: peerId,
              sender_id: lastMsg.sender_id,
              body: lastMsg.body,
              message_type: lastMsg.message_type || "text",
              content_data: lastMsg.content_data,
              created_at: lastMsg.created_at,
              updated_at: lastMsg.updated_at || lastMsg.created_at,
              sender: profileMap[lastMsg.sender_id]
                ? { user_id: lastMsg.sender_id, ...profileMap[lastMsg.sender_id] }
                : null,
            }
          : undefined;

        // Compute unread based on last_read_at
        const myParticipation = participations.find(
          (p: any) => p.thread_id === t.id
        );
        const unreadCount =
          lastMsg && myParticipation?.last_read_at
            ? new Date(lastMsg.created_at) > new Date(myParticipation.last_read_at)
              ? 1
              : 0
            : lastMsg && lastMsg.sender_id !== userId
            ? 1
            : 0;

        return {
          id: peerId, // peer user_id as thread id
          name: t.name,
          type: "direct" as const,
          created_by: t.created_by,
          created_at: t.created_at,
          updated_at: t.updated_at,
          participants: enrichedParticipants,
          last_message: lastMessage,
          unread_count: unreadCount,
          _legacyThreadId: t.id, // keep original for message fetching
        } as GlobalMessageThread & { _legacyThreadId: string };
      })
      .filter(Boolean) as GlobalMessageThread[];
  } catch (err) {
    console.warn("Legacy threads fallback error:", err);
    return [];
  }
}

/**
 * Fetch messages from legacy global_messages table for a given legacy thread id.
 */
async function fetchLegacyMessages(legacyThreadId: string): Promise<GlobalMessage[]> {
  try {
    const { data, error } = await supabase
      .from("global_messages")
      .select("id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at")
      .eq("thread_id", legacyThreadId)
      .order("created_at", { ascending: true })
      .limit(100) as any;

    if (error || !data) {
      console.warn("Legacy messages fallback failed:", error?.message);
      return [];
    }

    const senderIds = Array.from(new Set(data.map((m: any) => m.sender_id).filter(Boolean)));
    const profileMap = await enrichProfiles(senderIds as string[]);

    return data.map((m: any) => ({
      id: m.id,
      thread_id: m.thread_id,
      sender_id: m.sender_id,
      body: m.body,
      message_type: m.message_type || "text",
      content_data: m.content_data,
      created_at: m.created_at,
      updated_at: m.updated_at || m.created_at,
      sender: profileMap[m.sender_id]
        ? { user_id: m.sender_id, ...profileMap[m.sender_id] }
        : null,
    }));
  } catch (err) {
    console.warn("Legacy messages fallback error:", err);
    return [];
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useGlobalMessages(
  activeThreadId?: string | null,
  forceActive?: boolean
) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [typingUsers] = useState<
    Array<{ id: string; name: string; avatar?: string }>
  >([]);

  const isGlobalContext = forceActive ?? currentRole === "community";

  // ── Threads (conversations list) ──────────────────────────────────

  const {
    data: threads = [],
    isLoading: isThreadsLoading,
    isFetching: isThreadsFetching,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["global-threads", user?.id],
    queryFn: async (): Promise<GlobalMessageThread[]> => {
      if (!user || !isGlobalContext) return [];

      // Fetch from both gateway and legacy in parallel
      const [conversations, legacyThreads] = await Promise.all([
        fetchConversations().catch((err) => {
          console.warn("Gateway fetchConversations failed, using legacy only:", err.message);
          return [] as ChatConversation[];
        }),
        fetchLegacyThreads(user.id),
      ]);

      // Build gateway threads
      let gatewayThreads: GlobalMessageThread[] = [];
      if (conversations && conversations.length > 0) {
        const allUserIds = new Set<string>([user.id]);
        conversations.forEach((c) => {
          allUserIds.add(c.peer_id);
          if (c.last_message) {
            allUserIds.add(c.last_message.sender_id);
            allUserIds.add(c.last_message.receiver_id);
          }
        });

        const profileMap = await enrichProfiles(Array.from(allUserIds));

        gatewayThreads = conversations.map((conv) => {
          const peer = profileMap[conv.peer_id] || {
            display_name: "Unknown User",
            avatar_url: null,
          };
          const me = profileMap[user.id] || {
            display_name: "Me",
            avatar_url: null,
          };

          const lastMsg = conv.last_message;
          const unreadCount =
            lastMsg &&
            lastMsg.sender_id !== user.id &&
            !lastMsg.read_at
              ? 1
              : 0;

          return {
            id: conv.peer_id,
            name: undefined,
            type: "direct" as const,
            created_by: user.id,
            created_at: lastMsg?.created_at || new Date().toISOString(),
            updated_at: lastMsg?.created_at || new Date().toISOString(),
            participants: [
              {
                user_id: user.id,
                display_name: me.display_name,
                avatar_url: me.avatar_url,
                role: "member",
              },
              {
                user_id: conv.peer_id,
                display_name: peer.display_name,
                avatar_url: peer.avatar_url,
                role: "member",
              },
            ],
            last_message: lastMsg
              ? toGlobalMessage(lastMsg, conv.peer_id, profileMap)
              : undefined,
            unread_count: unreadCount,
          } satisfies GlobalMessageThread;
        });
      }

      // Merge: gateway wins on duplicates (same peer_id as thread id)
      const gatewayIds = new Set(gatewayThreads.map((t) => t.id));
      const uniqueLegacy = legacyThreads.filter((t) => !gatewayIds.has(t.id));
      const merged = [...gatewayThreads, ...uniqueLegacy].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return merged;
    },
    enabled: !!user && isGlobalContext,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: (prev) => prev ?? (user ? getCachedThreads(user.id) ?? undefined : undefined),
  });

  useEffect(() => {
    if (user && threads.length > 0 && !isThreadsLoading) {
      persistThreads(user.id, threads);
    }
  }, [user, threads, isThreadsLoading]);

  // ── Messages for active thread (= peer) ───────────────────────────

  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    isFetching: isMessagesFetching,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["global-messages", activeThreadId],
    queryFn: async (): Promise<GlobalMessage[]> => {
      if (!user || !isGlobalContext || !activeThreadId) return [];

      // Check if this is a group thread - if so, skip gateway and use legacy directly
      const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
      const cachedThread = cachedThreads.find((t) => t.id === activeThreadId);
      const isGroupThread = cachedThread?.type === 'group';

      if (isGroupThread) {
        // Group threads always use legacy messages
        const legacyThreadId = (cachedThread as any)?._legacyThreadId || activeThreadId;
        return fetchLegacyMessages(legacyThreadId);
      }

      // Direct threads: try gateway first
      let gatewayMessages: GlobalMessage[] = [];
      try {
        const rawMessages = await fetchConversation(activeThreadId);
        const sorted = [...rawMessages].reverse();
        const senderIds = Array.from(
          new Set(sorted.map((m) => m.sender_id).filter(Boolean))
        );
        const profileMap = await enrichProfiles(senderIds);
        gatewayMessages = sorted.map((m) =>
          toGlobalMessage(m, activeThreadId, profileMap)
        );

        // Enrich gateway messages with content_data from global_messages table
        const msgIds = gatewayMessages.map((m) => m.id);
        if (msgIds.length > 0) {
          const { data: dbMsgs } = await supabase
            .from("global_messages")
            .select("id, message_type, content_data")
            .in("id", msgIds)
            .not("message_type", "eq", "text");
          
          if (dbMsgs && dbMsgs.length > 0) {
            const dbMap = new Map(dbMsgs.map((m) => [m.id, m]));
            gatewayMessages = gatewayMessages.map((m) => {
              const dbMsg = dbMap.get(m.id);
              if (dbMsg) {
                return { ...m, message_type: dbMsg.message_type, content_data: dbMsg.content_data };
              }
              return m;
            });
          }
        }
      } catch (err) {
        console.warn("Gateway fetchConversation failed, trying legacy:", (err as Error).message);
      }

      // If gateway returned messages, hydrate reply links and use them
      if (gatewayMessages.length > 0) {
        // Hydrate parent_message_id from chat_message_replies sidecar
        const msgIds = gatewayMessages.map((m) => m.id);
        if (msgIds.length > 0) {
          const { data: replyLinks } = await supabase
            .from("chat_message_replies" as any)
            .select("message_id, parent_message_id")
            .in("message_id", msgIds);
          if (replyLinks && replyLinks.length > 0) {
            const replyMap = new Map(replyLinks.map((r: any) => [r.message_id, r.parent_message_id]));
            gatewayMessages = gatewayMessages.map((m) => {
              const parentId = replyMap.get(m.id);
              if (parentId) return { ...m, parent_message_id: parentId } as any;
              return m;
            });
          }
        }
        return gatewayMessages;
      }

      // Fallback: check if there's a legacy thread for this peer
      const legacyThread = cachedThreads.find((t) => t.id === activeThreadId && (t as any)._legacyThreadId);
      const legacyThreadId = (legacyThread as any)?._legacyThreadId;

      if (legacyThreadId) {
        return fetchLegacyMessages(legacyThreadId);
      }

      // Also try using activeThreadId directly as a legacy thread id
      const legacyMessages = await fetchLegacyMessages(activeThreadId);
      return legacyMessages;
    },
    enabled: !!user && !!activeThreadId && isGlobalContext,
    staleTime: 30 * 1000, // 30 seconds – allows fast catch-up after background
    gcTime: GC_TIME,
    placeholderData: (prev) => prev ?? (activeThreadId ? getCachedMessages(activeThreadId) ?? undefined : undefined),
  });

  // Debounced persist to avoid scroll jank from frequent writes
  useEffect(() => {
    if (!activeThreadId || messages.length === 0 || isMessagesLoading) return;
    const timer = setTimeout(() => {
      persistMessages(activeThreadId, messages);
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeThreadId, messages, isMessagesLoading]);

  // ── Visibility-change reconciliation ───────────────────────────────
  // Refetch messages & threads when app returns to foreground (catches
  // any messages missed while WebSocket was suspended in background)
  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (activeThreadId) {
          queryClient.invalidateQueries({ queryKey: ["global-messages", activeThreadId] });
        }
        queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isGlobalContext, activeThreadId, queryClient]);

  // ── Stable messages ref (prevents re-renders when IDs haven't changed) ──
  const stableMessages = useMemo(() => messages, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(messages.map((m) => m.id)),
  ]);

  // ── Optimistic cache helpers ──────────────────────────────────────

  const updateMessagesOptimistically = useCallback(
    (threadId: string, updater: (prev: GlobalMessage[]) => GlobalMessage[]) => {
      queryClient.setQueryData(
        ["global-messages", threadId],
        (prev: GlobalMessage[] | undefined) => updater(prev || [])
      );
    },
    [queryClient]
  );

  const updateThreadsOptimistically = useCallback(
    (updater: (prev: GlobalMessageThread[]) => GlobalMessageThread[]) => {
      queryClient.setQueryData(
        ["global-threads", user?.id],
        (prev: GlobalMessageThread[] | undefined) => updater(prev || [])
      );
    },
    [queryClient, user?.id]
  );

  // ── Send message via gateway ──────────────────────────────────────

  const sendMessageLegacy = useCallback(
    async (
      threadId: string,
      body: string,
      messageType = "text",
      contentData?: any,
      _parentMessageId?: string,
      _actionButtons?: any[]
    ) => {
      if (!user || !isGlobalContext) return;

      try {
        setIsSending(true);

        // Optimistic message
        const optimistic: GlobalMessage & { parent_message_id?: string } = {
          id: `temp-${Date.now()}`,
          thread_id: threadId,
          sender_id: user.id,
          body,
          message_type: messageType,
          content_data: contentData || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: {
            user_id: user.id,
            display_name: user.user_metadata?.display_name || "Me",
            avatar_url: user.user_metadata?.avatar_url || null,
          },
          ..._parentMessageId ? { parent_message_id: _parentMessageId } : {},
        };

        updateMessagesOptimistically(threadId, (prev) => [...prev, optimistic]);
        messageCache.addMessage(threadId, "global", optimistic);

        // Check if this is a group thread (cache first, then DB fallback)
        const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
        const thread = cachedThreads.find((t) => t.id === threadId);
        let isGroupThread = thread?.type === 'group';

        // If thread not found in cache, check DB to avoid routing group messages to gateway
        if (!thread) {
          const { data: dbThread } = await supabase
            .from("global_message_threads")
            .select("id, type")
            .eq("id", threadId)
            .maybeSingle();
          if (dbThread?.type === 'group') {
            isGroupThread = true;
          }
        }

        let realMsg: GlobalMessage;

        if (isGroupThread) {
          // Group threads: insert directly into global_messages
          const legacyThreadId = (thread as any)?._legacyThreadId || threadId;
          const { data: inserted, error } = await supabase
            .from("global_messages")
            .insert({
              thread_id: legacyThreadId,
              sender_id: user.id,
              body,
              message_type: messageType,
              content_data: contentData || null,
            })
            .select()
            .single() as any;

          if (error) throw error;

          // Update thread's updated_at
          await supabase
            .from("global_message_threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", legacyThreadId);

          const profileMap = await enrichProfiles([user.id]);
          realMsg = {
            id: inserted.id,
            thread_id: threadId,
            sender_id: inserted.sender_id,
            body: inserted.body,
            message_type: inserted.message_type || "text",
            content_data: inserted.content_data,
            created_at: inserted.created_at,
            updated_at: inserted.updated_at || inserted.created_at,
            sender: profileMap[user.id]
              ? { user_id: user.id, ...profileMap[user.id] }
              : null,
          };
        } else {
          // Direct threads: use gateway API
          const created = await sendChatMessage(threadId, body);

          const profileMap = await enrichProfiles([created.sender_id]);
          realMsg = toGlobalMessage(
            { ...created, message_type: messageType, content_data: contentData } as any,
            threadId,
            profileMap
          );

          // If we have attachment data, update the global_messages record in DB
          if (messageType !== "text" && contentData) {
            supabase
              .from("global_messages")
              .update({ message_type: messageType, content_data: contentData })
              .eq("id", created.id)
              .then(({ error }) => {
                if (error) console.warn("Failed to update global message content_data:", error);
              });
          }

          // Persist reply link in sidecar table for direct messages
          if (_parentMessageId) {
            supabase
              .from("chat_message_replies" as any)
              .insert({
                message_id: created.id,
                parent_message_id: _parentMessageId,
                created_by: user.id,
              })
              .then(({ error }) => {
                if (error) console.warn("Failed to persist reply link:", error);
              });
            // Enrich realMsg with parent_message_id for immediate UI
            (realMsg as any).parent_message_id = _parentMessageId;
          }
        }

        // Replace optimistic with real
        updateMessagesOptimistically(threadId, (prev) =>
          prev.map((m) => (m.id === optimistic.id ? realMsg : m))
        );
        messageCache.updateMessage(threadId, "global", optimistic.id, realMsg);

        // Move thread to top
        const now = new Date().toISOString();
        updateThreadsOptimistically((prev) => {
          const existing = prev.find((t) => t.id === threadId);
          if (!existing) return prev;
          return [
            { ...existing, updated_at: now, last_message: realMsg },
            ...prev.filter((t) => t.id !== threadId),
          ];
        });

        return realMsg;
      } catch (error) {
        console.error("Error sending chat message:", error);
        // Rollback optimistic message so ghost messages don't linger
        updateMessagesOptimistically(threadId, (prev) =>
          prev.filter((m) => !m.id.startsWith("temp-"))
        );
        messageCache.removeMessage?.(threadId, "global", `temp-`);
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [user, isGlobalContext, updateMessagesOptimistically, updateThreadsOptimistically, queryClient]
  );

  const sendMessage = useCallback(
    async (args: SendMessageArgs & { actionButtons?: any[] }) => {
      return sendMessageLegacy(
        args.threadId,
        args.content,
        args.type || "text",
        args.contentData,
        args.parentMessageId,
        args.actionButtons
      );
    },
    [sendMessageLegacy]
  );

  // ── Create thread (start new conversation) ────────────────────────
  // For the gateway model, creating a "thread" is just sending the first
  // message or navigating to /inbox with the peer selected. We return a
  // virtual thread object so the UI can select it immediately.

  const createThread = useCallback(
    async (participantIds: string[], name?: string, type = "direct") => {
      if (!user || !isGlobalContext) return;
      if (type !== "direct" || participantIds.length !== 1) {
        console.warn("Gateway chat only supports direct 1:1 conversations");
        return;
      }

      const peerId = participantIds[0];
      const profileMap = await enrichProfiles([peerId, user.id]);
      const peer = profileMap[peerId] || { display_name: "Unknown", avatar_url: null };
      const me = profileMap[user.id] || { display_name: "Me", avatar_url: null };

      const virtualThread: GlobalMessageThread = {
        id: peerId,
        type: "direct",
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        participants: [
          { user_id: user.id, display_name: me.display_name, avatar_url: me.avatar_url, role: "member" },
          { user_id: peerId, display_name: peer.display_name, avatar_url: peer.avatar_url, role: "member" },
        ],
        unread_count: 0,
      };

      // Add to threads cache if not already present
      updateThreadsOptimistically((prev) => {
        if (prev.find((t) => t.id === peerId)) return prev;
        return [virtualThread, ...prev];
      });

      return virtualThread;
    },
    [user, isGlobalContext, updateThreadsOptimistically]
  );

  // ── Mark as read via gateway ──────────────────────────────────────

  const markAsReadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const markAsRead = useCallback(
    async (threadId: string) => {
      if (!user || !isGlobalContext) return;

      const existing = markAsReadTimeouts.current.get(threadId);
      if (existing) clearTimeout(existing);

      const timeout = setTimeout(async () => {
        try {
          // Check if group thread
          const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
          const thread = cachedThreads.find((t) => t.id === threadId);
          const isGroupThread = thread?.type === 'group';

          if (isGroupThread) {
            // For group threads, update last_read_at in global_thread_participants
            const legacyThreadId = (thread as any)?._legacyThreadId || threadId;
            await supabase
              .from("global_thread_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("thread_id", legacyThreadId)
              .eq("user_id", user.id);
          } else {
            await markChatRead(threadId);
          }

          updateThreadsOptimistically((prev) =>
            prev.map((t) =>
              t.id === threadId ? { ...t, unread_count: 0 } : t
            )
          );

          // Notify sidebar badge to refresh immediately
          window.dispatchEvent(new Event('chat-unread-refresh'));
        } catch (error) {
          console.error("Error marking chat as read:", error);
        } finally {
          markAsReadTimeouts.current.delete(threadId);
        }
      }, 300);

      markAsReadTimeouts.current.set(threadId, timeout);
    },
    [user, isGlobalContext, updateThreadsOptimistically, queryClient]
  );

  // ── Realtime: listen for new chat_messages ────────────────────────
  // Also handles reconnect catch-up: on SUBSCRIBED/reconnect, invalidate queries

  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const channelName = `chat_messages_realtime_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const raw = payload.new as ChatMessage;
          // Client-side filter: only process messages sent TO us
          if (raw.receiver_id !== user.id) return;
          const peerId = raw.sender_id; // incoming → sender is the peer

          const profileMap = await enrichProfiles([raw.sender_id]);
          const msg = toGlobalMessage(raw, peerId, profileMap);

          // Append to the peer's message list
          updateMessagesOptimistically(peerId, (prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Bump thread to top + increment unread
          updateThreadsOptimistically((prev) => {
            const existing = prev.find((t) => t.id === peerId);
            if (existing) {
              return [
                {
                  ...existing,
                  updated_at: raw.created_at,
                  last_message: msg,
                  unread_count: existing.unread_count + 1,
                },
                ...prev.filter((t) => t.id !== peerId),
              ];
            }
            // New conversation from unknown peer – refetch full list
            refetchThreads();
            return prev;
          });

          // Notify sidebar badge via the reliable client-side path
          window.dispatchEvent(new Event('chat-unread-refresh'));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ chat_messages realtime subscribed');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ chat_messages realtime error/timeout, will reconnect');
        }
      });

    // Reconnect catch-up: when channel reconnects after a drop,
    // invalidate queries to fetch any missed messages
    const handleOnline = () => {
      console.log('🔄 Network back online, invalidating chat queries');
      queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
      if (activeThreadId) {
        queryClient.invalidateQueries({ queryKey: ["global-messages", activeThreadId] });
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(channel);
    };
  }, [user, isGlobalContext, updateMessagesOptimistically, updateThreadsOptimistically, refetchThreads, queryClient, activeThreadId]);

  // ── Visibility catch-up: refetch on tab focus after silent websocket drops ──
  useEffect(() => {
    if (!user || !isGlobalContext || typeof window === 'undefined') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
        if (activeThreadId) {
          queryClient.invalidateQueries({ queryKey: ["global-messages", activeThreadId] });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, isGlobalContext, activeThreadId, queryClient]);

  // ── Realtime: listen for new global_messages (group chats) ────────

  useEffect(() => {
    if (!user || !isGlobalContext) return;

    // Get group thread IDs from cache to listen for
    const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
    const groupThreadIds = cachedThreads
      .filter((t) => t.type === 'group')
      .map((t) => (t as any)._legacyThreadId || t.id);

    if (groupThreadIds.length === 0) return;

    const channelName = `group_messages_realtime_${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_messages",
        },
        async (payload) => {
          const raw = payload.new as any;
          // Only handle messages for group threads we're part of
          if (!groupThreadIds.includes(raw.thread_id)) return;

          // Find the UI thread ID for this message
          const uiThread = cachedThreads.find(
            (t) => ((t as any)._legacyThreadId || t.id) === raw.thread_id
          );
          const uiThreadId = uiThread?.id || raw.thread_id;

          // Skip if message already exists in cache (e.g. from optimistic update)
          const currentMessages = queryClient.getQueryData<GlobalMessage[]>(["global-messages", uiThreadId]) || [];
          if (currentMessages.some((m) => m.id === raw.id)) return;

          const profileMap = await enrichProfiles([raw.sender_id]);

          const msg: GlobalMessage = {
            id: raw.id,
            thread_id: uiThreadId,
            sender_id: raw.sender_id,
            body: raw.body,
            message_type: raw.message_type || "text",
            content_data: raw.content_data,
            created_at: raw.created_at,
            updated_at: raw.updated_at || raw.created_at,
            sender: profileMap[raw.sender_id]
              ? { user_id: raw.sender_id, ...profileMap[raw.sender_id] }
              : null,
          };

          // Append to message list
          updateMessagesOptimistically(uiThreadId, (prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Bump thread to top + increment unread
          updateThreadsOptimistically((prev) => {
            const existing = prev.find((t) => t.id === uiThreadId);
            if (existing) {
              return [
                {
                  ...existing,
                  updated_at: raw.created_at,
                  last_message: msg,
                  unread_count: existing.unread_count + 1,
                },
                ...prev.filter((t) => t.id !== uiThreadId),
              ];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isGlobalContext, updateMessagesOptimistically, updateThreadsOptimistically, queryClient]);

  // ── Legacy compat shims ───────────────────────────────────────────

  const fetchThreads = useCallback(async () => {
    await refetchThreads();
  }, [refetchThreads]);

  const fetchMessagesCompat = useCallback(
    async (threadId?: string) => {
      if (threadId === activeThreadId) await refetchMessages();
    },
    [activeThreadId, refetchMessages]
  );

  const startTyping = useCallback(async (_threadId?: string) => {}, []);
  const stopTyping = useCallback(async (_threadId?: string) => {}, []);

  // ── Return ────────────────────────────────────────────────────────

  return {
    messages: stableMessages,
    threads,
    isLoading: isThreadsLoading || isMessagesLoading,
    isFetching: isThreadsFetching || isMessagesFetching,
    isThreadsLoading,
    isThreadsFetching,
    isMessagesLoading,
    isMessagesFetching,
    isSending,
    typingUsers,
    sendMessage,
    createThread,
    markAsRead,
    fetchMessages: fetchMessagesCompat,
    fetchThreads,
    refetchMessages: fetchMessagesCompat,
    startTyping,
    stopTyping,
    isGlobalContext,
  };
}
