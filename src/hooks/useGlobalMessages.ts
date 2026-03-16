import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";

import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';
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
interface SendMessageArgs {
  threadId: string;
  content: string;
  type?: string;
  contentData?: any;
  parentMessageId?: string;
}

// ── Cache timing constants ──────────────────────────────────────────
const STALE_TIME = 10 * 60 * 1000;  // 10 minutes — data shown without refetch
const GC_TIME = 30 * 60 * 1000;     // 30 minutes — cache kept in memory after unmount

// ── SCROLL FIX: In-memory profile cache (prevents redundant Supabase queries) ──
const profileCache = new Map<string, { display_name: string; avatar_url: string | null; cachedAt: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── SCROLL FIX: Debounced localStorage writes (prevents main-thread blocking) ──
const pendingPersist = new Map<string, NodeJS.Timeout>();
function debouncedPersistMessages(peerId: string, messages: any[]) {
  const existing = pendingPersist.get(`msg:${peerId}`);
  if (existing) clearTimeout(existing);
  pendingPersist.set(`msg:${peerId}`, setTimeout(() => {
    persistMessages(peerId, messages);
    pendingPersist.delete(`msg:${peerId}`);
  }, 1000)); // 1 second debounce
}
function debouncedPersistThreads(userId: string, threads: any[]) {
  const existing = pendingPersist.get(`thr:${userId}`);
  if (existing) clearTimeout(existing);
  pendingPersist.set(`thr:${userId}`, setTimeout(() => {
    persistThreads(userId, threads);
    pendingPersist.delete(`thr:${userId}`);
  }, 1000)); // 1 second debounce
}

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
    message_type: (msg as any).message_type || "text",
    content_data: (msg as any).metadata || undefined,
    created_at: msg.created_at,
    updated_at: msg.created_at,
    sender: profileMap[msg.sender_id]
      ? { user_id: msg.sender_id, ...profileMap[msg.sender_id] }
      : null,
  };
}

/** Fetch profiles from Supabase for a set of user IDs (with in-memory cache) */
async function enrichProfiles(
  userIds: string[]
): Promise<Record<string, { display_name: string; avatar_url: string | null }>> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return {};

  // SCROLL FIX: Check in-memory cache first — avoid Supabase queries for known profiles
  const now = Date.now();
  const map: Record<string, { display_name: string; avatar_url: string | null }> = {};
  const uncachedIds: string[] = [];

  for (const uid of ids) {
    const cached = profileCache.get(uid);
    if (cached && now - cached.cachedAt < PROFILE_CACHE_TTL) {
      map[uid] = { display_name: cached.display_name, avatar_url: cached.avatar_url };
    } else {
      uncachedIds.push(uid);
    }
  }

  // All profiles are cached — no network needed
  if (uncachedIds.length === 0) return map;

  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    supabase
      .from("global_community_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", uncachedIds),
    supabase
      .from("profiles")
      .select("user_id, display_name, full_name, avatar_url")
      .in("user_id", uncachedIds),
  ]);

  uncachedIds.forEach((uid) => {
    // Override: always use known Vitana identity regardless of DB state
    if (isVitanaBot(uid)) {
      const vitanaProfile = {
        display_name: VITANA_BOT_DISPLAY_NAME,
        avatar_url: VITANA_BOT_AVATAR_URL,
      };
      map[uid] = vitanaProfile;
      profileCache.set(uid, { ...vitanaProfile, cachedAt: now });
      return;
    }
    const gp = globalProfiles?.find((p) => p.user_id === uid);
    const mp = mainProfiles?.find((p) => p.user_id === uid);
    const profile = {
      display_name:
        gp?.display_name || mp?.display_name || mp?.full_name || "Unknown User",
      avatar_url: gp?.avatar_url || mp?.avatar_url || null,
    };
    map[uid] = profile;
    // Store in cache
    profileCache.set(uid, { ...profile, cachedAt: now });
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
      .order("created_at", { ascending: false })
      .limit(threadIds.length * 2) as any;

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

    // 5. Build GlobalMessageThread objects (direct + group)
    return threadRows
      .map((t: any) => {
        const threadParticipants = (allParticipants || []).filter(
          (p: any) => p.thread_id === t.id
        );

        const isGroup = t.type === "group";

        // For direct threads, use peer user_id as thread id (gateway convention)
        // For group threads, use the actual thread UUID
        const otherParticipant = threadParticipants.find(
          (p: any) => p.user_id !== userId
        );

        const threadIdentifier = isGroup ? t.id : otherParticipant?.user_id;
        if (!threadIdentifier) return null; // skip direct threads with no peer

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
              thread_id: threadIdentifier,
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
          id: threadIdentifier,
          name: t.name,
          type: isGroup ? ("group" as const) : ("direct" as const),
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

// ── Vitana Bot ────────────────────────────────────────────────────────

const VITANA_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

// ── Direct chat_messages Supabase fallback ────────────────────────────
/**
 * When the gateway is down and no legacy threads exist, query
 * chat_messages directly via the frontend Supabase client.
 * Mirrors the gateway's own fallback at chat.ts:154-180.
 */
async function fetchDirectFromChatMessages(userId: string): Promise<GlobalMessageThread[]> {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200) as any;

    if (error || !data || data.length === 0) {
      if (error) console.warn("[chat] Direct chat_messages fallback failed:", error.message);
      return [];
    }

    // Dedup by peer — keep latest message per peer
    const seen = new Map<string, typeof data[0]>();
    for (const msg of data) {
      const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!seen.has(peerId)) seen.set(peerId, msg);
    }

    // Enrich profiles
    const peerIds = Array.from(seen.keys());
    const profileMap = await enrichProfiles([userId, ...peerIds]);

    return Array.from(seen.entries()).map(([peerId, lastMsg]) => {
      const peer = profileMap[peerId] || { display_name: "Unknown User", avatar_url: null };
      const me = profileMap[userId] || { display_name: "Me", avatar_url: null };

      const lastMessage: GlobalMessage = {
        id: lastMsg.id,
        thread_id: peerId,
        sender_id: lastMsg.sender_id,
        body: lastMsg.content,
        message_type: lastMsg.message_type || "text",
        content_data: lastMsg.metadata || undefined,
        created_at: lastMsg.created_at,
        updated_at: lastMsg.created_at,
        sender: profileMap[lastMsg.sender_id]
          ? { user_id: lastMsg.sender_id, ...profileMap[lastMsg.sender_id] }
          : null,
      };

      return {
        id: peerId,
        type: "direct" as const,
        created_by: userId,
        created_at: lastMsg.created_at,
        updated_at: lastMsg.created_at,
        participants: [
          { user_id: userId, display_name: me.display_name, avatar_url: me.avatar_url, role: "member" },
          { user_id: peerId, display_name: peer.display_name, avatar_url: peer.avatar_url, role: "member" },
        ],
        last_message: lastMessage,
        unread_count: lastMsg.sender_id !== userId && !lastMsg.read_at ? 1 : 0,
      } satisfies GlobalMessageThread;
    });
  } catch (err) {
    console.warn("[chat] Direct chat_messages fallback error:", err);
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

      // Fallback: if gateway returned nothing, try reading chat_messages directly
      let directThreads: GlobalMessageThread[] = [];
      if (conversations.length === 0) {
        directThreads = await fetchDirectFromChatMessages(user.id);
      }

      // Merge: gateway wins > direct Supabase > legacy
      const gatewayIds = new Set(gatewayThreads.map((t) => t.id));
      const directIds = new Set(directThreads.map((t) => t.id));
      const uniqueDirect = directThreads.filter((t) => !gatewayIds.has(t.id));
      const uniqueLegacy = legacyThreads.filter((t) => !gatewayIds.has(t.id) && !directIds.has(t.id));
      const merged = [...gatewayThreads, ...uniqueDirect, ...uniqueLegacy].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Auto-seed Vitana thread if not present
      const hasVitana = merged.some((t) => t.id === VITANA_BOT_USER_ID);
      if (!hasVitana) {
        merged.push({
          id: VITANA_BOT_USER_ID,
          name: "Vitana",
          type: "direct",
          created_by: VITANA_BOT_USER_ID,
          created_at: new Date().toISOString(),
          updated_at: "2000-01-01T00:00:00.000Z", // sort to bottom until real messages exist
          participants: [
            { user_id: user.id, display_name: "Me", avatar_url: null, role: "member" },
            { user_id: VITANA_BOT_USER_ID, display_name: "Vitana", avatar_url: null, role: "member" },
          ],
          last_message: {
            id: "vitana-welcome",
            thread_id: VITANA_BOT_USER_ID,
            sender_id: VITANA_BOT_USER_ID,
            body: "Hi! I'm Vitana. Send me a message to get started.",
            message_type: "text",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sender: { user_id: VITANA_BOT_USER_ID, display_name: "Vitana" },
          },
          unread_count: 0,
        });
      }

      return merged;
    },
    enabled: !!user && isGlobalContext,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // Show last-known threads from localStorage instantly while refetching
    placeholderData: (prev) => prev ?? (user ? getCachedThreads(user.id) ?? undefined : undefined),
  });

  // Write-back: persist threads to localStorage (DEBOUNCED to prevent scroll blocking)
  useEffect(() => {
    if (user && threads.length > 0 && !isThreadsLoading) {
      debouncedPersistThreads(user.id, threads);
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

      // Check if active thread is a group thread
      const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
      const activeThread = cachedThreads.find((t) => t.id === activeThreadId);
      const isGroupThread = activeThread?.type === "group";

      // Group threads: always load from global_messages directly (thread UUID = thread_id)
      if (isGroupThread) {
        return fetchLegacyMessages(activeThreadId);
      }

      // Direct threads: activeThreadId is the peer's user ID — try gateway first
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
      } catch (err) {
        console.warn("Gateway fetchConversation failed, trying legacy:", (err as Error).message);
      }

      // If gateway returned messages, use them
      if (gatewayMessages.length > 0) return gatewayMessages;

      // Fallback 1: read directly from chat_messages table (direct DMs live here)
      try {
        const { data: dmRows, error: dmErr } = await supabase
          .from("chat_messages")
          .select("*")
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeThreadId}),and(sender_id.eq.${activeThreadId},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true })
          .limit(100) as any;

        if (!dmErr && dmRows && dmRows.length > 0) {
          const senderIds = Array.from(new Set(dmRows.map((m: any) => m.sender_id).filter(Boolean)));
          const profileMap = await enrichProfiles(senderIds as string[]);
          return dmRows.map((m: any) => toGlobalMessage(m, activeThreadId, profileMap));
        }
      } catch (err) {
        console.warn("[chat] chat_messages fallback failed:", (err as Error).message);
      }

      // Fallback 2: legacy global_messages (for old threads that used global_message_threads)
      const legacyThread = cachedThreads.find((t) => t.id === activeThreadId && (t as any)._legacyThreadId);
      const legacyThreadId = (legacyThread as any)?._legacyThreadId;

      if (legacyThreadId) {
        return fetchLegacyMessages(legacyThreadId);
      }

      return fetchLegacyMessages(activeThreadId);
    },
    enabled: !!user && !!activeThreadId && isGlobalContext,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // Show last-known messages from localStorage instantly while refetching
    placeholderData: (prev) => prev ?? (activeThreadId ? getCachedMessages(activeThreadId) ?? undefined : undefined),
  });

  // Write-back: persist messages to localStorage (DEBOUNCED to prevent scroll blocking)
  useEffect(() => {
    if (activeThreadId && messages.length > 0 && !isMessagesLoading) {
      debouncedPersistMessages(activeThreadId, messages);
    }
  }, [activeThreadId, messages, isMessagesLoading]);

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

        // Check if this is a group thread
        const cachedThreads = queryClient.getQueryData<GlobalMessageThread[]>(["global-threads", user.id]) || [];
        const targetThread = cachedThreads.find((t) => t.id === threadId);
        const isGroupThread = targetThread?.type === "group";

        let realMsg: GlobalMessage;

        if (isGroupThread) {
          // Group threads: insert directly into global_messages
          const { data: inserted, error: insertErr } = await supabase
            .from("global_messages")
            .insert({
              thread_id: threadId,
              sender_id: user.id,
              body,
              message_type: "text",
            } as any)
            .select()
            .single();
          if (insertErr || !inserted) throw insertErr || new Error("Group message insert failed");

          // Update thread's updated_at
          await supabase
            .from("global_message_threads")
            .update({ updated_at: new Date().toISOString() } as any)
            .eq("id", threadId);

          const profileMap = await enrichProfiles([user.id]);
          realMsg = {
            id: (inserted as any).id,
            thread_id: threadId,
            sender_id: user.id,
            body,
            message_type: "text",
            created_at: (inserted as any).created_at,
            updated_at: (inserted as any).updated_at || (inserted as any).created_at,
            sender: profileMap[user.id]
              ? { user_id: user.id, ...profileMap[user.id] }
              : { user_id: user.id, display_name: "Me" },
          };
        } else {
          // Direct threads: gateway first, fallback to chat_messages
          let created: ChatMessage;
          try {
            created = await sendChatMessage(threadId, body);
          } catch (gatewayErr) {
            console.warn("[chat] Gateway send failed, falling back to Supabase direct insert:", gatewayErr);
            const tenantId = (user as any).app_metadata?.active_tenant_id;
            if (!tenantId) throw gatewayErr;
            const { data: inserted, error: insertErr } = await supabase
              .from("chat_messages")
              .insert({
                tenant_id: tenantId,
                sender_id: user.id,
                receiver_id: threadId,
                content: body,
              })
              .select()
              .single();
            if (insertErr || !inserted) throw insertErr || new Error("Supabase insert returned no data");
            created = inserted as unknown as ChatMessage;
          }

          const profileMap = await enrichProfiles([created.sender_id]);
          realMsg = toGlobalMessage(created, threadId, profileMap);
        }

        // Replace optimistic with real

        updateMessagesOptimistically(threadId, (prev) =>
          prev.map((m) => (m.id === optimistic.id ? realMsg : m))
        );

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

          // Notify useChatUnreadCount to refresh badge immediately
          window.dispatchEvent(new Event('chat-unread-refresh'));
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

  // ─── FIX 1: STABILIZED REALTIME SUBSCRIPTION ───────────────────────
  // Create stable channel ID per hook instance (not regenerated on every render)
  const realtimeChannelId = useRef(`chat_realtime_${Math.random().toString(36).slice(2, 11)}`);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  // FIX 2: ADD GUARANTEED CONVERGENCE PATH - web-only periodic refresh as safety net
  const conversationOpenRef = useRef(false);

  useEffect(() => {
    conversationOpenRef.current = !!activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const channelId = realtimeChannelId.current;

    const channel = supabase
      .channel(channelId)
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
          const peerId = raw.sender_id;

          try {
            const profileMap = await enrichProfiles([raw.sender_id]);
            const msg = toGlobalMessage(raw, peerId, profileMap);

            // FIX 2.1: Update both active thread messages cache AND threads cache
            queryClient.setQueryData(
              ["global-messages", peerId],
              (prev: GlobalMessage[] | undefined) => {
                if (!prev) return [msg];
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              }
            );

            queryClient.setQueryData(
              ["global-threads", user.id],
              (prev: GlobalMessageThread[] | undefined) => {
                if (!prev) {
                  // FIX 2.2: Fallback refetch when cache is missing/stale
                  queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
                  return prev;
                }

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

                // New conversation - trigger refetch
                queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
                return prev;
              }
            );
          } catch (error) {
            console.error("[useGlobalMessages] Realtime event processing error:", error);
            // FIX 1.3: On realtime failure, trigger targeted query invalidation
            queryClient.invalidateQueries({ queryKey: ["global-messages", peerId] });
            queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
          }
        }
      )
      .subscribe((status) => {
        // FIX 1.3: Add subscription status/error handling
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
          console.error('[useGlobalMessages] Realtime subscription error - falling back to polling');
          // On channel failure, invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isGlobalContext, queryClient]); // FIX 1.2: Remove unstable dependencies (updateMessagesOptimistically, updateThreadsOptimistically, refetchThreads)

  // SCROLL FIX: Only poll as fallback when realtime is broken (NOT during normal operation)
  // The 10-second polling was the PRIMARY cause of scroll freeze — it triggered refetches
  // during scroll, causing re-renders that disrupted scroll position.
  useEffect(() => {
    if (!user || !isGlobalContext || typeof window === 'undefined') return;
    // Only enable polling when realtime subscription has failed
    if (realtimeStatus !== 'error') return;

    console.warn('[useGlobalMessages] Realtime failed, falling back to 30s polling');
    const interval = setInterval(() => {
      if (conversationOpenRef.current && activeThreadId) {
        queryClient.invalidateQueries({
          queryKey: ["global-messages", activeThreadId],
          refetchType: 'none'
        });
      }
    }, 30000); // 30 seconds (was 10s — that was far too aggressive)

    return () => clearInterval(interval);
  }, [user, isGlobalContext, activeThreadId, queryClient, realtimeStatus]);

  // Catch silent websocket drops: refetch when user returns to tab
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

  // ── SCROLL FIX: Stable message reference (prevent re-renders when array content hasn't changed) ──
  const stableMessages = useMemo(() => messages, [
    // Only update reference when message IDs or count change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    messages.map((m) => m.id).join(","),
  ]);

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
    realtimeStatus, // Expose realtime status for debugging
  };
}
