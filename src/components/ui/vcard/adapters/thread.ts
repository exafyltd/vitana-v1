/**
 * VTID-05110 — inbox threads → `row` VCard slots, plus the list ordering the
 * Messages screen already uses (pinned first, newest first; direct chats
 * de-duplicated per counterpart; the Groups filter puts unread groups first).
 *
 * The ordering is a faithful copy of the rules inlined in
 * `src/pages/Messages.tsx` (renderConversationList / renderMobileConversationList)
 * so the Spotlight list shows exactly the conversations, in exactly the order,
 * the legacy desktop list shows. Pure functions — no data fetching, no caching.
 */
import { getConversationDisplayAvatar, getConversationDisplayTitle, getOtherParticipant } from '@/utils/conversationHelpers';
import type { VCardData } from './index';

export interface InboxThreadLike {
  id: string;
  name?: string;
  type?: string;
  updated_at: string;
  unread_count?: number;
  avatar_url?: string;
  participants?: Array<{ user_id: string; display_name?: string; avatar_url?: string }>;
  last_message?: { body?: string; sender_id?: string } | null;
}

export type InboxListFilter = 'all' | 'groups' | 'direct' | 'contacts';

export function filterThreads<T extends InboxThreadLike>(threads: T[], filter: InboxListFilter): T[] {
  if (filter === 'all') return threads;
  if (filter === 'groups') return threads.filter((t) => t.type === 'group');
  if (filter === 'direct') return threads.filter((t) => t.type === 'direct');
  return [];
}

const time = (iso: string) => new Date(iso).getTime();

/** The list the Messages screen shows for a filter, in the order it shows it. */
export function orderThreadsForList<T extends InboxThreadLike>(
  threads: T[],
  filter: InboxListFilter,
  pinned: ReadonlySet<string>,
  currentUserId: string | undefined,
): T[] {
  const list = filterThreads(threads, filter);
  const byPinThenDate = (a: T, b: T) => {
    const ap = pinned.has(a.id) ? 1 : 0;
    const bp = pinned.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return time(b.updated_at) - time(a.updated_at);
  };

  if (filter === 'groups') {
    return [...list].sort((a, b) => {
      const ap = pinned.has(a.id) ? 1 : 0;
      const bp = pinned.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const au = (a.unread_count || 0) > 0 ? 1 : 0;
      const bu = (b.unread_count || 0) > 0 ? 1 : 0;
      if (au !== bu) return bu - au;
      return time(b.updated_at) - time(a.updated_at);
    });
  }

  // 'all' and 'direct': keep only the newest direct thread per counterpart.
  const out: Array<T & { _dedupeKey: string }> = [];
  for (const thread of [...list].sort(byPinThenDate)) {
    if (thread.type === 'direct') {
      const counterpart = thread.participants?.find((p) => p.user_id !== currentUserId);
      const key = counterpart?.user_id || 'unknown';
      const idx = out.findIndex((t) => t._dedupeKey === key);
      if (idx === -1) out.push({ ...thread, _dedupeKey: key });
      else if (time(thread.updated_at) > time(out[idx].updated_at)) {
        out.splice(idx, 1);
        out.push({ ...thread, _dedupeKey: key });
      }
    } else {
      out.push({ ...thread, _dedupeKey: thread.id });
    }
  }
  return out;
}

/** Sender label for a group's last message ("Anna: …"), when it was not me. */
export function lastMessageSenderName(thread: InboxThreadLike, currentUserId: string | undefined): string | undefined {
  const senderId = thread.last_message?.sender_id;
  if (thread.type !== 'group' || !senderId || senderId === currentUserId) return undefined;
  return thread.participants?.find((p) => p.user_id === senderId)?.display_name || undefined;
}

export function threadToVCard(thread: InboxThreadLike, currentUserId: string | undefined, untitled: string): VCardData {
  // getConversationDisplayTitle falls back to an English "Conversation"; the
  // Spotlight list uses the catalog's word for an untitled thread instead.
  const hasOwnTitle = (thread.type === 'group' && !!thread.name) || !!getOtherParticipant(thread, currentUserId);
  const title = hasOwnTitle ? getConversationDisplayTitle(thread, currentUserId) : thread.name || untitled;
  const avatar = getConversationDisplayAvatar(thread, currentUserId) || thread.avatar_url || null;
  const body = thread.last_message?.body?.trim() || undefined;
  const sender = lastMessageSenderName(thread, currentUserId);
  return {
    key: thread.id,
    media: { src: avatar, alt: title },
    title,
    meta: body && sender ? `${sender}: ${body}` : body,
  };
}

/** The member a direct thread is with (for presence + profile links). */
export function threadCounterpartId(thread: InboxThreadLike, currentUserId: string | undefined): string | undefined {
  if (thread.type === 'group') return undefined;
  return getOtherParticipant(thread, currentUserId)?.user_id || undefined;
}
