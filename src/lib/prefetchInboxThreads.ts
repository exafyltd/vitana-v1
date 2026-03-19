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
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';

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

// ── Main prefetch function ──────────────────────────────────────────

export async function prefetchInboxThreads(userId: string): Promise<PrefetchGlobalThread[]> {
  // Gateway call with 5-second timeout
  const conversations: ChatConversation[] = await Promise.race([
    fetchConversations(),
    new Promise<ChatConversation[]>((_, reject) =>
      setTimeout(() => reject(new Error('Gateway timeout (5s)')), 5000)
    ),
  ]).catch((err) => {
    console.warn('[prefetchInbox] Gateway failed/timed out:', err.message);
    return [] as ChatConversation[];
  });

  if (!conversations || conversations.length === 0) {
    // Don't bother with legacy fallback in prefetch — the hook will handle it
    return [];
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

  const threads: PrefetchGlobalThread[] = conversations.map((conv) => {
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

  return threads.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}
