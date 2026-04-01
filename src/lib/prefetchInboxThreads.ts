/**
 * Standalone prefetch helper for inbox threads.
 * Extracted so it can be called from AuthProvider (on SIGNED_IN)
 * and from the prefetch-registry without importing the full hook.
 *
 * Returns the same GlobalMessageThread[] shape that useGlobalMessages produces,
 * ensuring cache-key compatibility with queryKey: ['global-threads', userId].
 */

import { supabase } from '@/integrations/supabase/client';
import {
  fetchConversations,
  type ChatConversation,
  type ChatMessage,
} from '@/hooks/useChatApi';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL, VITANA_BOT_USER_ID } from '@/lib/vitanaBotIdentity';

// ── Minimal types (mirroring useGlobalMessages) ─────────────────────

export interface PrefetchGlobalMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data?: any;
  created_at: string;
  updated_at: string;
  sender?: { user_id: string; display_name?: string; avatar_url?: string } | null;
}

export interface PrefetchGlobalThread {
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
  last_message?: PrefetchGlobalMessage;
  unread_count: number;
}

// ── Profile enrichment (lightweight, no in-memory cache needed for prefetch) ──

async function enrichProfiles(
  userIds: string[]
): Promise<Record<string, { display_name: string; avatar_url: string | null }>> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return {};

  const map: Record<string, { display_name: string; avatar_url: string | null }> = {};

  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', ids),
    supabase
      .from('profiles')
      .select('user_id, display_name, full_name, avatar_url')
      .in('user_id', ids),
  ]);

  ids.forEach((uid) => {
    if (isVitanaBot(uid)) {
      map[uid] = { display_name: VITANA_BOT_DISPLAY_NAME, avatar_url: VITANA_BOT_AVATAR_URL };
      return;
    }
    const gp = globalProfiles?.find((p) => p.user_id === uid);
    const mp = mainProfiles?.find((p) => p.user_id === uid);
    map[uid] = {
      display_name: gp?.display_name || mp?.display_name || (mp as any)?.full_name || 'Unknown User',
      avatar_url: gp?.avatar_url || mp?.avatar_url || null,
    };
  });
  return map;
}

// ── Vitana bot seed thread (ensures cache is never empty) ──────────

function makeVitanaBotThread(userId: string): PrefetchGlobalThread {
  return {
    id: VITANA_BOT_USER_ID,
    name: VITANA_BOT_DISPLAY_NAME,
    type: 'direct',
    created_by: VITANA_BOT_USER_ID,
    created_at: new Date().toISOString(),
    updated_at: '2000-01-01T00:00:00.000Z',
    participants: [
      { user_id: userId, display_name: 'Me', avatar_url: null, role: 'member' },
      { user_id: VITANA_BOT_USER_ID, display_name: VITANA_BOT_DISPLAY_NAME, avatar_url: VITANA_BOT_AVATAR_URL, role: 'member' },
    ],
    last_message: {
      id: 'vitana-welcome',
      thread_id: VITANA_BOT_USER_ID,
      sender_id: VITANA_BOT_USER_ID,
      body: "Hi! I'm Vitana. Send me a message to get started.",
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: { user_id: VITANA_BOT_USER_ID, display_name: VITANA_BOT_DISPLAY_NAME },
    },
    unread_count: 0,
  };
}

// ── Legacy group thread fetcher (mirrors fetchLegacyThreads but groups only) ──

async function fetchLegacyGroupThreads(userId: string): Promise<PrefetchGlobalThread[]> {
  try {
    // 1. Get threads the user participates in
    const { data: participations, error: partErr } = await supabase
      .from('global_thread_participants')
      .select('thread_id, role, last_read_at')
      .eq('user_id', userId) as any;

    if (partErr || !participations || participations.length === 0) return [];

    const threadIds = participations.map((p: any) => p.thread_id);

    // 2. Get group thread metadata only
    const { data: threadRows, error: threadErr } = await supabase
      .from('global_message_threads')
      .select('id, name, type, created_by, created_at, updated_at')
      .in('id', threadIds)
      .eq('type', 'group')
      .order('updated_at', { ascending: false }) as any;

    if (threadErr || !threadRows || threadRows.length === 0) return [];

    const groupThreadIds = threadRows.map((t: any) => t.id);

    // 3. Get participants + last messages in parallel
    const [{ data: allParticipants }, { data: lastMessages }] = await Promise.all([
      supabase
        .from('global_thread_participants')
        .select('thread_id, user_id, role, last_read_at')
        .in('thread_id', groupThreadIds) as any,
      supabase
        .from('global_messages')
        .select('id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at')
        .in('thread_id', groupThreadIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(groupThreadIds.length * 3, 30)) as any,
    ]);

    // Last message per thread
    const lastMsgByThread: Record<string, any> = {};
    (lastMessages || []).forEach((m: any) => {
      if (!lastMsgByThread[m.thread_id]) lastMsgByThread[m.thread_id] = m;
    });

    // Profile enrichment
    const allUserIds = new Set<string>([userId]);
    (allParticipants || []).forEach((p: any) => allUserIds.add(p.user_id));
    Object.values(lastMsgByThread).forEach((m: any) => allUserIds.add(m.sender_id));
    const profileMap = await enrichProfiles(Array.from(allUserIds));

    // 4. Build thread objects
    return threadRows
      .map((t: any) => {
        const threadParticipants = (allParticipants || []).filter(
          (p: any) => p.thread_id === t.id
        );

        const enrichedParticipants = threadParticipants.map((p: any) => ({
          user_id: p.user_id,
          display_name: profileMap[p.user_id]?.display_name || 'Unknown',
          avatar_url: profileMap[p.user_id]?.avatar_url || null,
          role: p.role || 'member',
          last_read_at: p.last_read_at,
        }));

        const lastMsg = lastMsgByThread[t.id];
        const lastMessage: PrefetchGlobalMessage | undefined = lastMsg
          ? {
              id: lastMsg.id,
              thread_id: t.id,
              sender_id: lastMsg.sender_id,
              body: lastMsg.body,
              message_type: lastMsg.message_type || 'text',
              content_data: lastMsg.content_data,
              created_at: lastMsg.created_at,
              updated_at: lastMsg.updated_at || lastMsg.created_at,
              sender: profileMap[lastMsg.sender_id]
                ? { user_id: lastMsg.sender_id, ...profileMap[lastMsg.sender_id] }
                : null,
            }
          : undefined;

        const unreadCount = lastMsg && lastMsg.sender_id !== userId ? 1 : 0;

        return {
          id: t.id,
          name: t.name,
          type: 'group',
          created_by: t.created_by,
          created_at: t.created_at,
          updated_at: t.updated_at,
          participants: enrichedParticipants,
          last_message: lastMessage,
          unread_count: unreadCount,
        } as PrefetchGlobalThread;
      })
      .filter(Boolean) as PrefetchGlobalThread[];
  } catch (err) {
    console.warn('[prefetchInbox] Legacy group threads error:', err);
    return [];
  }
}

// ── Main prefetch function ──────────────────────────────────────────

export async function prefetchInboxThreads(userId: string): Promise<PrefetchGlobalThread[]> {
  // Fetch gateway DMs + legacy group threads in parallel
  const [conversations, legacyGroupThreads] = await Promise.all([
    // Gateway call with 8-second timeout
    Promise.race([
      fetchConversations(),
      new Promise<ChatConversation[]>((_, reject) =>
        setTimeout(() => reject(new Error('Gateway timeout (8s)')), 8000)
      ),
    ]).catch((err) => {
      console.warn('[prefetchInbox] Gateway failed/timed out:', err.message);
      return [] as ChatConversation[];
    }),
    // Legacy group threads with 5-second timeout
    Promise.race([
      fetchLegacyGroupThreads(userId),
      new Promise<PrefetchGlobalThread[]>((_, reject) =>
        setTimeout(() => reject(new Error('Legacy groups timeout (5s)')), 5000)
      ),
    ]).catch((err) => {
      console.warn('[prefetchInbox] Legacy groups failed/timed out:', err.message);
      return [] as PrefetchGlobalThread[];
    }),
  ]);

  if ((!conversations || conversations.length === 0) && legacyGroupThreads.length === 0) {
    return [makeVitanaBotThread(userId)];
  }

  // Collect user IDs for profile enrichment
  const allUserIds = new Set<string>([userId]);
  conversations.forEach((c) => {
    allUserIds.add(c.peer_id);
    if (c.last_message) {
      allUserIds.add(c.last_message.sender_id);
      allUserIds.add(c.last_message.receiver_id);
    }
  });

  const profileMap = await enrichProfiles(Array.from(allUserIds));

  const dmThreads: PrefetchGlobalThread[] = conversations.map((conv) => {
    const peer = profileMap[conv.peer_id] || { display_name: 'Unknown User', avatar_url: null };
    const me = profileMap[userId] || { display_name: 'Me', avatar_url: null };
    const lastMsg = conv.last_message;
    const unreadCount = lastMsg && lastMsg.sender_id !== userId && !lastMsg.read_at ? 1 : 0;

    const lastMessage: PrefetchGlobalMessage | undefined = lastMsg
      ? {
          id: lastMsg.id,
          thread_id: conv.peer_id,
          sender_id: lastMsg.sender_id,
          body: lastMsg.content,
          message_type: (lastMsg as any).message_type || 'text',
          content_data: (lastMsg as any).metadata || undefined,
          created_at: lastMsg.created_at,
          updated_at: lastMsg.created_at,
          sender: profileMap[lastMsg.sender_id]
            ? { user_id: lastMsg.sender_id, ...profileMap[lastMsg.sender_id] }
            : null,
        }
      : undefined;

    return {
      id: conv.peer_id,
      type: 'direct',
      created_by: userId,
      created_at: lastMsg?.created_at || new Date().toISOString(),
      updated_at: lastMsg?.created_at || new Date().toISOString(),
      participants: [
        { user_id: userId, display_name: me.display_name, avatar_url: me.avatar_url, role: 'member' },
        { user_id: conv.peer_id, display_name: peer.display_name, avatar_url: peer.avatar_url, role: 'member' },
      ],
      last_message: lastMessage,
      unread_count: unreadCount,
    };
  });

  // Merge DM threads + legacy group threads, dedup by id
  const seenIds = new Set(dmThreads.map((t) => t.id));
  const mergedThreads = [...dmThreads];
  for (const gt of legacyGroupThreads) {
    if (!seenIds.has(gt.id)) {
      mergedThreads.push(gt);
      seenIds.add(gt.id);
    }
  }

  return mergedThreads.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
