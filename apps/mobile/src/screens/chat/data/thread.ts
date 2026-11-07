/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — how the
 * native DM screen finds its conversation and loads its rows. Native twin of
 * the read paths of `src/hooks/useGlobalMessages.ts` (class B, re-implemented):
 *
 *  - `enrichProfiles` (L297-367): names/avatars from `global_community_profiles`
 *    and `profiles`, the Vitana bot always "Vitana".
 *  - `resolveThread`: the web finds the thread in its inbox list
 *    (Messages.tsx:243-254 for `/inbox/u/:recipientId`, :186-209 for
 *    `/inbox/t/:threadId`). That list keys a direct chat by the peer's user id
 *    (gateway threads L775, legacy threads L489) and a group by its
 *    `global_message_threads.id`. The native screen opens one conversation,
 *    so it asks the same tables for that one id: a `global_message_threads`
 *    row → its participants (legacy group, or a legacy direct thread whose id
 *    is the peer); no row → a direct chat with that user id.
 *  - `fetchThreadMessages` (`buildGlobalMessagesQueryFn`, L889-972): groups
 *    read `global_messages`; direct chats try the gateway first, then
 *    `chat_messages`, then the legacy `global_messages` thread.
 * Reads only.
 */
import { getSupabase } from '../../../auth/client';
import { fetchConversation, type ChatMessage } from './api';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, type ChatViewMessage, type ConversationThread, type ThreadParticipant } from './types';

export const MESSAGE_PAGE_SIZE = 50;

export interface ProfileEntry {
  display_name: string;
  avatar_url: string | null;
  _missing?: boolean;
}

type Row = Record<string, unknown>;

export async function enrichProfiles(userIds: string[]): Promise<Record<string, ProfileEntry>> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return {};
  const supabase = getSupabase();
  const [{ data: globalProfiles }, { data: mainProfiles }] = await Promise.all([
    supabase.from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', ids),
    supabase.from('profiles').select('user_id, display_name, full_name, avatar_url').in('user_id', ids),
  ]);
  const map: Record<string, ProfileEntry> = {};
  for (const uid of ids) {
    if (isVitanaBot(uid)) {
      map[uid] = { display_name: VITANA_BOT_DISPLAY_NAME, avatar_url: null };
      continue;
    }
    const gp = ((globalProfiles as Row[] | null) ?? []).find((p) => p.user_id === uid);
    const mp = ((mainProfiles as Row[] | null) ?? []).find((p) => p.user_id === uid);
    map[uid] = {
      display_name: String(gp?.display_name || mp?.display_name || mp?.full_name || 'Unknown User'),
      avatar_url: (gp?.avatar_url as string | null) || (mp?.avatar_url as string | null) || null,
      _missing: !(gp || mp),
    };
  }
  return map;
}

function toParticipant(userId: string, role: string, profiles: Record<string, ProfileEntry>, lastReadAt?: string | null): ThreadParticipant {
  return {
    user_id: userId,
    display_name: profiles[userId]?.display_name ?? null,
    avatar_url: profiles[userId]?.avatar_url ?? null,
    role: role || 'member',
    last_read_at: lastReadAt ?? null,
  };
}

/** A direct chat with `peerId` (the gateway thread shape, useGlobalMessages.ts:774-795). */
export async function directThread(peerId: string, userId: string, legacyThreadId: string | null = null): Promise<ConversationThread> {
  const profiles = await enrichProfiles([userId, peerId]);
  return {
    id: peerId,
    type: 'direct',
    created_by: userId,
    participants: [toParticipant(userId, 'member', profiles), toParticipant(peerId, 'member', profiles)],
    legacyThreadId,
  };
}

/** `/inbox/t/:threadId`: a legacy `global_message_threads` row, else a peer's user id. */
export async function resolveThread(threadId: string, userId: string): Promise<ConversationThread> {
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from('global_message_threads')
    .select('id, name, type, created_by, created_at, updated_at')
    .eq('id', threadId)
    .maybeSingle();
  if (!row) return directThread(threadId, userId);
  const t = row as Row;
  const { data: parts } = await supabase.from('global_thread_participants').select('thread_id, user_id, role, last_read_at').eq('thread_id', threadId);
  const rows = (parts as Row[] | null) ?? [];
  if (t.type === 'group') {
    const profiles = await enrichProfiles(rows.map((p) => String(p.user_id)));
    return {
      id: threadId,
      type: 'group',
      name: (t.name as string | null) ?? null,
      created_by: (t.created_by as string | null) ?? null,
      participants: rows.map((p) => toParticipant(String(p.user_id), String(p.role ?? 'member'), profiles, p.last_read_at as string | null)),
      legacyThreadId: threadId,
    };
  }
  const peer = rows.find((p) => p.user_id !== userId);
  return directThread(peer ? String(peer.user_id) : threadId, userId, threadId);
}

export function chatMessageToView(msg: ChatMessage, threadId: string, profiles: Record<string, ProfileEntry>): ChatViewMessage {
  return {
    id: msg.id,
    thread_id: threadId,
    sender_id: msg.sender_id,
    body: msg.content,
    message_type: msg.message_type || 'text',
    content_data: (msg.metadata as Record<string, unknown> | undefined) ?? null,
    created_at: msg.created_at,
    read_at: msg.read_at ?? null,
    delivered_at: msg.delivered_at ?? null,
    client_message_id: msg.client_message_id ?? null,
    reply_to_message_id: msg.reply_to_message_id ?? null,
    sender: profiles[msg.sender_id] ? { user_id: msg.sender_id, ...profiles[msg.sender_id] } : null,
  };
}

async function fetchLegacyMessages(legacyThreadId: string, opts: { before?: string; limit: number }): Promise<ChatViewMessage[]> {
  let query = getSupabase()
    .from('global_messages')
    .select('id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at')
    .eq('thread_id', legacyThreadId)
    .order('created_at', { ascending: false })
    .limit(opts.limit);
  if (opts.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error || !data) return [];
  const rows = [...(data as Row[])].reverse();
  const profiles = await enrichProfiles(rows.map((m) => String(m.sender_id)));
  return rows.map((m) => ({
    id: String(m.id),
    thread_id: String(m.thread_id),
    sender_id: String(m.sender_id),
    body: String(m.body ?? ''),
    message_type: String(m.message_type || 'text'),
    content_data: (m.content_data as Record<string, unknown> | null) ?? null,
    created_at: String(m.created_at),
    sender: profiles[String(m.sender_id)] ? { user_id: String(m.sender_id), ...profiles[String(m.sender_id)] } : null,
  }));
}

/** One page of a conversation, oldest first. Throws only when the gateway AND both fallbacks fail for a direct chat. */
export async function fetchThreadMessages(
  thread: ConversationThread,
  userId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<ChatViewMessage[]> {
  const limit = opts.limit ?? MESSAGE_PAGE_SIZE;
  if (thread.type === 'group') return fetchLegacyMessages(thread.legacyThreadId ?? thread.id, { before: opts.before, limit });

  let gatewayOk = false;
  let gatewayError: unknown = null;
  try {
    const raw = await fetchConversation(thread.id, limit, opts.before);
    gatewayOk = true;
    if (raw.length > 0) {
      const sorted = [...raw].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const profiles = await enrichProfiles(sorted.map((m) => m.sender_id));
      return sorted.map((m) => chatMessageToView(m, thread.id, profiles));
    }
  } catch (err) {
    gatewayError = err;
  }
  if (opts.before && gatewayOk) return [];

  const peer = thread.id;
  let dmQuery = getSupabase()
    .from('chat_messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${peer}),and(sender_id.eq.${peer},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.before) dmQuery = dmQuery.lt('created_at', opts.before);
  const { data: dmRows, error: dmErr } = await dmQuery;
  if (!dmErr && dmRows && (dmRows as unknown[]).length > 0) {
    const rows = [...(dmRows as unknown as ChatMessage[])].reverse();
    const profiles = await enrichProfiles(rows.map((m) => m.sender_id));
    return rows.map((m) => chatMessageToView(m, thread.id, profiles));
  }

  const legacy = await fetchLegacyMessages(thread.legacyThreadId ?? thread.id, { before: opts.before, limit });
  if (legacy.length === 0 && !gatewayOk && dmErr) throw gatewayError instanceof Error ? gatewayError : new Error('load failed');
  return legacy;
}

// ── Display helpers (src/utils/conversationHelpers.ts, mirrored: it imports the class-B bot identity) ──

export function otherParticipant(thread: ConversationThread | null | undefined, userId: string | undefined): ThreadParticipant | null {
  if (!thread || !userId) return null;
  return thread.participants.find((p) => p.user_id !== userId) ?? null;
}

export function participantName(p: ThreadParticipant | null | undefined, unknown: string): string {
  if (!p) return unknown;
  if (isVitanaBot(p.user_id)) return VITANA_BOT_DISPLAY_NAME;
  return (p.display_name || '').trim() || unknown;
}

// The composer is one row: "Nachricht an " + name + "…" must fit on it, so the name is cut short.
const PLACEHOLDER_GROUP_NAME_MAX = 14;

/** conversationHelpers.ts:142-156 — "Message <first name>…" / "Message <group>…". */
export function composerPlaceholder(thread: ConversationThread | null, userId: string | undefined, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (thread?.type === 'group') {
    const raw = (thread.name || '').trim();
    const name = raw.length > PLACEHOLDER_GROUP_NAME_MAX ? raw.slice(0, PLACEHOLDER_GROUP_NAME_MAX).trimEnd() : raw;
    return t('screens.messages.messageGroupPlaceholder', { name });
  }
  const other = otherParticipant(thread, userId);
  const full = other ? participantName(other, '') : '';
  return t('screens.messages.messagePersonPlaceholder', { name: full.split(/\s+/)[0] ?? '' });
}
