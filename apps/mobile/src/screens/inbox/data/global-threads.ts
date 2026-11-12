/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the Community
 * (global) inbox thread list, re-implemented natively from the web
 * `buildGlobalThreadsQueryFn` (`src/hooks/useGlobalMessages.ts:712-880`) and
 * its helpers (`fetchDirectUnreadCounts`, `fetchGroupUnreadCounts`,
 * `enrichProfiles`, `fetchLegacyThreads`, `fetchDirectFromChatMessages`).
 * `useGlobalMessages` is class B (web Supabase client), so it is copied over
 * the native client, never core-extracted (plan decision 2, sparring R1-F2).
 *
 * Same sources, same queries, same merge as the web:
 *  - gateway `GET /chat/conversations` (3 s timeout, failure → legacy only),
 *  - legacy `global_thread_participants` / `global_message_threads` /
 *    `global_messages`,
 *  - `chat_messages` DM rows (receiver set, no group) as the fallback,
 *  - direct unread from `chat_messages.read_at IS NULL`,
 *  - profiles from `global_community_profiles` + `profiles`; peers with no
 *    profile row are dropped (no phantom "Unknown User" rows),
 *  - the freshest copy of each thread wins; an all-empty answer keeps the
 *    previous list; the Vitana thread is seeded while none exists.
 * Reads only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchConversations, type ChatConversation, type ChatMessage } from './chat-api';
import { VITANA_BOT_DISPLAY_NAME, VITANA_BOT_USER_ID, isVitanaBot, type InboxMessage, type InboxThread } from './threads-model';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ProfileEntry = { display_name: string; avatar_url: string | null; _missing?: boolean };
type ProfileMap = Record<string, ProfileEntry>;

/** Gateway timeout of the web (3 s, Cloud Run cold starts settle in ~2 s). */
export const GATEWAY_TIMEOUT_MS = 3000;
const UNKNOWN_USER = 'Unknown User';

async function fetchDirectUnreadCounts(sb: SupabaseClient, userId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await (sb.from('chat_messages').select('sender_id').eq('receiver_id', userId).is('read_at', null).neq('sender_id', userId) as any);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data as Array<{ sender_id: string }>) counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
    return counts;
  } catch {
    return {};
  }
}

async function fetchGroupUnreadCounts(sb: SupabaseClient, userId: string, parts: Array<{ thread_id: string; last_read_at: string | null }>): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  try {
    for (const p of parts) {
      let q = sb.from('global_messages').select('id', { count: 'exact', head: true }).eq('thread_id', p.thread_id).neq('sender_id', userId) as any;
      if (p.last_read_at) q = q.gt('created_at', p.last_read_at);
      const { count, error } = await q;
      if (!error && count !== null && count !== undefined) counts[p.thread_id] = count;
    }
  } catch {
    return counts;
  }
  return counts;
}

async function enrichProfiles(sb: SupabaseClient, userIds: string[]): Promise<ProfileMap> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return {};
  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    sb.from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', ids) as any,
    sb.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', ids) as any,
  ]);
  const map: ProfileMap = {};
  for (const uid of ids) {
    if (isVitanaBot(uid)) {
      map[uid] = { display_name: VITANA_BOT_DISPLAY_NAME, avatar_url: null };
      continue;
    }
    const gp = (globalProfiles as any[] | null)?.find((p) => p.user_id === uid);
    const mp = (mainProfiles as any[] | null)?.find((p) => p.user_id === uid);
    map[uid] = {
      display_name: gp?.display_name || mp?.display_name || mp?.full_name || UNKNOWN_USER,
      avatar_url: gp?.avatar_url || mp?.avatar_url || null,
      _missing: !(gp || mp),
    };
  }
  return map;
}

function isRealPeer(peerId: string | null | undefined, profiles: ProfileMap): boolean {
  if (!peerId) return false;
  if (isVitanaBot(peerId)) return true;
  const p = profiles[peerId];
  return !!p && !p._missing;
}

function dmMessage(msg: ChatMessage, peerId: string): InboxMessage {
  return { id: msg.id, thread_id: peerId, sender_id: msg.sender_id, body: msg.content, message_type: msg.message_type || 'text', created_at: msg.created_at, updated_at: msg.created_at };
}

function directThread(userId: string, peerId: string, profiles: ProfileMap, last: InboxMessage | undefined, at: string, unread: number): InboxThread {
  const peer = profiles[peerId] || { display_name: UNKNOWN_USER, avatar_url: null };
  const me = profiles[userId] || { display_name: '', avatar_url: null };
  return {
    id: peerId,
    type: 'direct',
    created_by: userId,
    created_at: at,
    updated_at: at,
    participants: [
      { user_id: userId, display_name: me.display_name, avatar_url: me.avatar_url, role: 'member' },
      { user_id: peerId, display_name: peer.display_name, avatar_url: peer.avatar_url, role: 'member' },
    ],
    last_message: last,
    unread_count: unread,
  };
}

async function fetchLegacyThreads(sb: SupabaseClient, userId: string): Promise<InboxThread[]> {
  try {
    const { data: participations, error: partErr } = await (sb.from('global_thread_participants').select('thread_id, role, last_read_at').eq('user_id', userId) as any);
    if (partErr || !participations || participations.length === 0) return [];
    const threadIds: string[] = participations.map((p: any) => p.thread_id);
    const groupUnread = await fetchGroupUnreadCounts(sb, userId, participations);

    const { data: threadRows, error: threadErr } = await (sb
      .from('global_message_threads')
      .select('id, name, type, created_by, created_at, updated_at')
      .in('id', threadIds)
      .order('updated_at', { ascending: false }) as any);
    if (threadErr || !threadRows) return [];

    const { data: allParticipants, error: allErr } = await (sb.from('global_thread_participants').select('thread_id, user_id, role, last_read_at').in('thread_id', threadIds) as any);
    if (allErr || !allParticipants) return [];

    const { data: lastMessages, error: lastErr } = await (sb
      .from('global_messages')
      .select('id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })
      .limit(Math.max(threadIds.length * 3, 100)) as any);
    if (lastErr || !lastMessages) return [];

    const lastByThread: Record<string, any> = {};
    for (const m of lastMessages as any[]) if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = m;

    const ids = new Set<string>([userId]);
    (allParticipants as any[]).forEach((p) => ids.add(p.user_id));
    Object.values(lastByThread).forEach((m: any) => ids.add(m.sender_id));
    const profiles = await enrichProfiles(sb, Array.from(ids));

    const out: InboxThread[] = [];
    for (const t of threadRows as any[]) {
      const parts = (allParticipants as any[]).filter((p) => p.thread_id === t.id);
      const isGroup = t.type === 'group';
      const other = parts.find((p) => p.user_id !== userId);
      const identifier = isGroup ? t.id : other?.user_id;
      if (!identifier) continue;
      if (!isGroup && !isRealPeer(other?.user_id, profiles)) continue;
      const last = lastByThread[t.id];
      out.push({
        id: identifier,
        name: t.name,
        type: isGroup ? 'group' : 'direct',
        created_by: t.created_by,
        created_at: t.created_at,
        updated_at: t.updated_at,
        participants: parts.map((p) => ({
          user_id: p.user_id,
          display_name: profiles[p.user_id]?.display_name || null,
          avatar_url: profiles[p.user_id]?.avatar_url || null,
          role: p.role || 'member',
          last_read_at: p.last_read_at,
        })),
        last_message: last
          ? { id: last.id, thread_id: identifier, sender_id: last.sender_id, body: last.body, message_type: last.message_type || 'text', created_at: last.created_at, updated_at: last.updated_at || last.created_at }
          : undefined,
        unread_count: last && last.sender_id === userId ? 0 : (groupUnread[t.id] ?? (last ? 1 : 0)),
        _legacyThreadId: t.id,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchDirectFromChatMessages(sb: SupabaseClient, userId: string, unread: Record<string, number>): Promise<InboxThread[]> {
  try {
    const { data, error } = await (sb
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .not('receiver_id', 'is', null)
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .limit(2000) as any);
    if (error || !data || data.length === 0) return [];
    const seen = new Map<string, ChatMessage>();
    for (const msg of data as ChatMessage[]) {
      const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!seen.has(peerId)) seen.set(peerId, msg);
    }
    const profiles = await enrichProfiles(sb, [userId, ...seen.keys()]);
    return Array.from(seen.entries()).flatMap(([peerId, last]) =>
      isRealPeer(peerId, profiles) ? [directThread(userId, peerId, profiles, dmMessage(last, peerId), last.created_at, unread[peerId] || 0)] : [],
    );
  } catch {
    return [];
  }
}

/** The Vitana seed row: bottom of the list (2000-01-01) until a real Vitana conversation exists. */
export function vitanaSeedThread(userId: string, welcome: string): InboxThread {
  const now = new Date().toISOString();
  return {
    id: VITANA_BOT_USER_ID,
    name: VITANA_BOT_DISPLAY_NAME,
    type: 'direct',
    created_by: VITANA_BOT_USER_ID,
    created_at: now,
    updated_at: '2000-01-01T00:00:00.000Z',
    participants: [
      { user_id: userId, display_name: '', avatar_url: null, role: 'member' },
      { user_id: VITANA_BOT_USER_ID, display_name: VITANA_BOT_DISPLAY_NAME, avatar_url: null, role: 'member' },
    ],
    last_message: { id: 'vitana-welcome', thread_id: VITANA_BOT_USER_ID, sender_id: VITANA_BOT_USER_ID, body: welcome, message_type: 'text', created_at: now, updated_at: now },
    unread_count: 0,
  };
}

/**
 * One fetch of the Community thread list. `previous` is the cached list (the
 * web "keep previous cached threads" guard); `welcome` is the translated
 * Vitana seed text.
 */
export async function fetchGlobalThreads(sb: SupabaseClient, userId: string, previous: InboxThread[] | undefined, welcome: string): Promise<InboxThread[]> {
  const gateway = Promise.race([
    fetchConversations(),
    new Promise<ChatConversation[]>((_, reject) => setTimeout(() => reject(new Error('Gateway timeout (3s)')), GATEWAY_TIMEOUT_MS)),
  ]).catch(() => [] as ChatConversation[]);

  const [conversations, legacyThreads, directUnread] = await Promise.all([gateway, fetchLegacyThreads(sb, userId), fetchDirectUnreadCounts(sb, userId)]);

  let gatewayThreads: InboxThread[] = [];
  if (conversations.length > 0) {
    const ids = new Set<string>([userId]);
    for (const c of conversations) {
      ids.add(c.peer_id);
      if (c.last_message) {
        ids.add(c.last_message.sender_id);
        ids.add(c.last_message.receiver_id);
      }
    }
    const profiles = await enrichProfiles(sb, Array.from(ids));
    gatewayThreads = conversations.flatMap((c) => {
      if (!isRealPeer(c.peer_id, profiles)) return [];
      const at = c.last_message?.created_at || new Date().toISOString();
      return [directThread(userId, c.peer_id, profiles, c.last_message ? dmMessage(c.last_message, c.peer_id) : undefined, at, directUnread[c.peer_id] || 0)];
    });
  }

  const directThreads = await fetchDirectFromChatMessages(sb, userId, directUnread);

  const byId = new Map<string, InboxThread>();
  for (const t of [...legacyThreads, ...directThreads, ...gatewayThreads]) {
    const existing = byId.get(t.id);
    if (!existing || new Date(t.updated_at) > new Date(existing.updated_at)) byId.set(t.id, t);
  }
  const merged = Array.from(byId.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (merged.length === 0 && previous && previous.length > 0) return previous;
  if (!merged.some((t) => t.id === VITANA_BOT_USER_ID)) merged.push(vitanaSeedThread(userId, welcome));
  return merged;
}
