/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox thread
 * model and the pure list rules of the web inbox, MIRRORED natively:
 *  - the thread / message shapes (`GlobalMessageThread`, `TenantMessageThread`),
 *  - the Vitana bot identity (`src/lib/vitanaBotIdentity.ts`; it reads
 *    `import.meta.env`, class B — the id is the one every `.env` sets),
 *  - `getOtherParticipant` / `getConversationDisplayTitle` /
 *    `getConversationDisplayAvatar` (`src/utils/conversationHelpers.ts`),
 *  - `compareInboxThreads` (`src/lib/inboxThreadOrder.ts`),
 *  - the chat-group thread ids (`src/hooks/useChatGroupsAsThreads.ts`),
 *  - the filter + sort + per-peer dedupe of `Messages.tsx`
 *    `renderMobileConversationList` (lines 1182-1268).
 * Those web modules sit on class-B imports, so they are copied, not
 * core-extracted (plan decision 2). Display fallbacks are passed in
 * translated; nothing here renders text.
 */

export interface InboxParticipant {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string;
  last_read_at?: string | null;
}

export interface InboxMessage {
  id: string;
  thread_id?: string;
  sender_id: string;
  body: string;
  message_type?: string;
  created_at: string;
  updated_at?: string;
}

export interface InboxThread {
  id: string;
  name?: string | null;
  type: string;
  created_by?: string;
  created_at?: string;
  updated_at: string;
  avatar_url?: string | null;
  participants?: InboxParticipant[];
  last_message?: InboxMessage;
  unread_count: number;
  /** Legacy global thread UUID of a direct thread whose `id` is the peer id. */
  _legacyThreadId?: string;
}

export type InboxContext = 'global' | 'tenant';
export type ConversationFilter = 'all' | 'direct' | 'groups';

/** `src/lib/vitanaBotIdentity.ts` (VITE_VITANA_BOT_USER_ID default; same value in every .env). */
export const VITANA_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const VITANA_BOT_DISPLAY_NAME = 'Vitana';

export function isVitanaBot(userId: string | null | undefined): boolean {
  return !!userId && userId === VITANA_BOT_USER_ID;
}

export const CHAT_GROUP_THREAD_PREFIX = 'chat_group:';

export function isChatGroupThreadId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(CHAT_GROUP_THREAD_PREFIX);
}

export function chatGroupIdFromThreadId(id: string): string {
  return id.replace(CHAT_GROUP_THREAD_PREFIX, '');
}

export function getOtherParticipant(thread: InboxThread | null | undefined, currentUserId: string | undefined): InboxParticipant | null {
  if (!thread?.participants || !currentUserId) return null;
  return thread.participants.filter((p) => p.user_id !== currentUserId)[0] || null;
}

function participantName(p: InboxParticipant | null, unknown: string): string {
  if (!p) return unknown;
  if (isVitanaBot(p.user_id)) return VITANA_BOT_DISPLAY_NAME;
  return p.display_name || p.full_name || unknown;
}

/** Group name, else the other participant's name, else the thread name, else `fallbacks.conversation`. */
export function getConversationDisplayTitle(
  thread: InboxThread | null | undefined,
  currentUserId: string | undefined,
  fallbacks: { unknown: string; conversation: string },
): string {
  if (!thread) return fallbacks.conversation;
  if (thread.type === 'group' && thread.name) return thread.name;
  const other = getOtherParticipant(thread, currentUserId);
  if (other) return participantName(other, fallbacks.unknown);
  return thread.name || fallbacks.conversation;
}

/** No single avatar for a group; the other participant's for a DM. The bot's web avatar is a web asset (/vitana-orb-clean.svg), so it falls back to the initial. */
export function getConversationDisplayAvatar(thread: InboxThread | null | undefined, currentUserId: string | undefined): string | null {
  if (!thread || thread.type === 'group') return null;
  const other = getOtherParticipant(thread, currentUserId);
  if (!other || isVitanaBot(other.user_id)) return null;
  return other.avatar_url || null;
}

function isVitanaThread(thread: InboxThread, currentUserId?: string | null): boolean {
  if (isVitanaBot(thread.id)) return true;
  if (thread.type && thread.type !== 'direct') return false;
  const peer = thread.participants?.find((p) => p.user_id !== currentUserId);
  return isVitanaBot(peer?.user_id);
}

/** Unread Vitana thread first, then pinned, then latest activity. */
export function compareInboxThreads(a: InboxThread, b: InboxThread, pinned: { has(id: string): boolean }, currentUserId?: string | null): number {
  const av = (a.unread_count || 0) > 0 && isVitanaThread(a, currentUserId) ? 1 : 0;
  const bv = (b.unread_count || 0) > 0 && isVitanaThread(b, currentUserId) ? 1 : 0;
  if (av !== bv) return bv - av;
  const ap = pinned.has(a.id) ? 1 : 0;
  const bp = pinned.has(b.id) ? 1 : 0;
  if (ap !== bp) return bp - ap;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

/** `getFilteredThreads` (Messages.tsx:667-672) for the mobile pills. */
export function filterThreads(threads: InboxThread[], filter: ConversationFilter): InboxThread[] {
  if (filter === 'groups') return threads.filter((t) => t.type === 'group');
  if (filter === 'direct') return threads.filter((t) => t.type === 'direct');
  return threads;
}

/** Search on title + last message body (Messages.tsx:1186-1193). */
export function searchThreads(threads: InboxThread[], query: string, title: (t: InboxThread) => string): InboxThread[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter((t) => title(t).toLowerCase().includes(q) || (t.last_message?.body || '').toLowerCase().includes(q));
}

/** Sort, then keep one direct thread per counterpart — the newer one (Messages.tsx:1215-1233). */
export function sortAndDedupe(threads: InboxThread[], pinned: { has(id: string): boolean }, currentUserId?: string): InboxThread[] {
  const acc: Array<InboxThread & { _dedupeKey: string }> = [];
  for (const thread of [...threads].sort((a, b) => compareInboxThreads(a, b, pinned, currentUserId))) {
    if (thread.type === 'direct') {
      const key = thread.participants?.find((p) => p.user_id !== currentUserId)?.user_id || 'unknown';
      const i = acc.findIndex((t) => t._dedupeKey === key);
      if (i < 0) acc.push({ ...thread, _dedupeKey: key });
      else if (new Date(thread.updated_at) > new Date(acc[i].updated_at)) {
        acc.splice(i, 1);
        acc.push({ ...thread, _dedupeKey: key });
      }
    } else {
      acc.push({ ...thread, _dedupeKey: thread.id });
    }
  }
  return acc;
}

/**
 * The conversation route a list row opens (navigated by path through the
 * resolver; the screens belong to the `conversation-chat` lane):
 * a chat group → `/inbox/g/<groupId>` (Messages.tsx:455-460), a global direct
 * thread (id = peer id) → `/inbox/u/<peerId>`, any other thread →
 * `/inbox/t/<threadId>` with `?context=tenant` in the Network context (the web
 * page reads `context` with the thread, Messages.tsx:166-200).
 */
export function conversationPathFor(thread: InboxThread, context: InboxContext, currentUserId?: string): string {
  if (isChatGroupThreadId(thread.id)) return `/inbox/g/${encodeURIComponent(chatGroupIdFromThreadId(thread.id))}`;
  if (context === 'global' && thread.type === 'direct') {
    const peer = getOtherParticipant(thread, currentUserId)?.user_id ?? thread.id;
    return `/inbox/u/${encodeURIComponent(peer)}`;
  }
  const base = `/inbox/t/${encodeURIComponent(thread.id)}`;
  return context === 'tenant' ? `${base}?context=tenant` : base;
}
