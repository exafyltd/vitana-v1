import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";
import { messageCache } from "./messageCache";
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

// ── Helpers ──────────────────────────────────────────────────────────

/** Map a gateway ChatMessage → GlobalMessage the UI understands */
function toGlobalMessage(
  msg: ChatMessage,
  peerId: string,
  profileMap: Record<string, { display_name: string; avatar_url: string | null }>
): GlobalMessage {
  return {
    id: msg.id,
    thread_id: peerId,
    sender_id: msg.sender_id,
    body: msg.content,
    message_type: "text",
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

      const conversations = await fetchConversations();
      if (!conversations || conversations.length === 0) return [];

      // Collect all peer IDs + own user ID for profile enrichment
      const allUserIds = new Set<string>([user.id]);
      conversations.forEach((c) => {
        allUserIds.add(c.peer_id);
        if (c.last_message) {
          allUserIds.add(c.last_message.sender_id);
          allUserIds.add(c.last_message.receiver_id);
        }
      });

      const profileMap = await enrichProfiles(Array.from(allUserIds));

      return conversations.map((conv) => {
        const peer = profileMap[conv.peer_id] || {
          display_name: "Unknown User",
          avatar_url: null,
        };
        const me = profileMap[user.id] || {
          display_name: "Me",
          avatar_url: null,
        };

        const lastMsg = conv.last_message;
        // Compute unread: messages FROM peer that haven't been read
        const unreadCount =
          lastMsg &&
          lastMsg.sender_id !== user.id &&
          !lastMsg.read_at
            ? 1 // Gateway only gives last_message; real count comes from badge hook
            : 0;

        return {
          id: conv.peer_id, // thread ID = peer ID for direct chats
          name: undefined, // direct chats show participant name
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
    },
    enabled: !!user && isGlobalContext,
    staleTime: 2 * 60 * 1000,
  });

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

      // activeThreadId is the peer's user ID
      const rawMessages = await fetchConversation(activeThreadId);

      // Gateway returns newest-first; UI expects ascending
      const sorted = [...rawMessages].reverse();

      const senderIds = Array.from(
        new Set(sorted.map((m) => m.sender_id).filter(Boolean))
      );
      const profileMap = await enrichProfiles(senderIds);

      return sorted.map((m) =>
        toGlobalMessage(m, activeThreadId, profileMap)
      );
    },
    enabled: !!user && !!activeThreadId && isGlobalContext,
    staleTime: 2 * 60 * 1000,
  });

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
      _messageType = "text",
      _contentData?: any,
      _parentMessageId?: string,
      _actionButtons?: any[]
    ) => {
      if (!user || !isGlobalContext) return;

      try {
        setIsSending(true);

        // Optimistic message
        const optimistic: GlobalMessage = {
          id: `temp-${Date.now()}`,
          thread_id: threadId,
          sender_id: user.id,
          body,
          message_type: "text",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: {
            user_id: user.id,
            display_name: user.user_metadata?.display_name || "Me",
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        };

        updateMessagesOptimistically(threadId, (prev) => [...prev, optimistic]);
        messageCache.addMessage(threadId, "global", optimistic);

        // threadId is the peer's user ID
        const created = await sendChatMessage(threadId, body);

        // Replace optimistic with real
        const profileMap = await enrichProfiles([created.sender_id]);
        const realMsg = toGlobalMessage(created, threadId, profileMap);

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
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [user, isGlobalContext, updateMessagesOptimistically, updateThreadsOptimistically]
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
          await markChatRead(threadId);

          updateThreadsOptimistically((prev) =>
            prev.map((t) =>
              t.id === threadId ? { ...t, unread_count: 0 } : t
            )
          );

          // Sync across tabs
          await supabase.channel("unread_sync").send({
            type: "broadcast",
            event: "thread_read",
            payload: {
              threadId,
              userId: user.id,
              timestamp: new Date().toISOString(),
              context: "global",
            },
          });
        } catch (error) {
          console.error("Error marking chat as read:", error);
        } finally {
          markAsReadTimeouts.current.delete(threadId);
        }
      }, 300);

      markAsReadTimeouts.current.set(threadId, timeout);
    },
    [user, isGlobalContext, updateThreadsOptimistically]
  );

  // ── Realtime: listen for new chat_messages ────────────────────────

  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const raw = payload.new as ChatMessage;
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isGlobalContext, updateMessagesOptimistically, updateThreadsOptimistically, refetchThreads]);

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
    messages,
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
