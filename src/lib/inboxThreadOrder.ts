/**
 * VTID-05100 (Companion Messages, Phase 2) — inbox thread order.
 *
 * One comparator for every Messenger inbox list (desktop "all" / "direct"
 * tabs, the mobile list, and the desktop auto-select), so the order rule
 * lives in one place:
 *
 *   1. The Vitana thread, while it has an unread Vitana message, sits on top.
 *   2. Threads the member pinned come next.
 *   3. Everything else by latest activity (updated_at, newest first).
 *
 * Once the Vitana message is read, the Vitana thread drops back to the
 * normal pinned/activity order like any other thread — it is never pinned
 * permanently.
 */
import { isVitanaBot } from '@/lib/vitanaBotIdentity';

export interface InboxOrderThread {
  id: string;
  type?: string;
  updated_at: string;
  unread_count?: number;
  participants?: { user_id: string }[];
}

/** True when the thread is the member's direct conversation with Vitana. */
export function isVitanaThread(thread: InboxOrderThread, currentUserId?: string | null): boolean {
  if (isVitanaBot(thread.id)) return true;
  if (thread.type && thread.type !== 'direct') return false;
  const peer = thread.participants?.find((p) => p.user_id !== currentUserId);
  return isVitanaBot(peer?.user_id);
}

/** True when the Vitana thread should be lifted to the top of the inbox. */
export function isUnreadVitanaThread(thread: InboxOrderThread, currentUserId?: string | null): boolean {
  return (thread.unread_count || 0) > 0 && isVitanaThread(thread, currentUserId);
}

/**
 * Comparator for Array.prototype.sort. `pinnedThreadIds` is the member's own
 * pin set (may be empty).
 */
export function compareInboxThreads(
  a: InboxOrderThread,
  b: InboxOrderThread,
  pinnedThreadIds: { has(id: string): boolean },
  currentUserId?: string | null,
): number {
  const av = isUnreadVitanaThread(a, currentUserId) ? 1 : 0;
  const bv = isUnreadVitanaThread(b, currentUserId) ? 1 : 0;
  if (av !== bv) return bv - av;
  const ap = pinnedThreadIds.has(a.id) ? 1 : 0;
  const bp = pinnedThreadIds.has(b.id) ? 1 : 0;
  if (ap !== bp) return bp - ap;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
