/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox unread
 * badge, re-implemented natively from the web `src/hooks/useChatUnreadCount.ts`
 * (class B: web Supabase client + realtime). One store per signed-in member:
 *  - total = gateway `GET /chat/unread-count` + Σ `unread_count` of
 *    `GET /chat/groups/`,
 *  - a realtime INSERT on `chat_messages` addressed to the member, or in one
 *    of their groups, schedules a recompute (500 ms),
 *  - a 60 s interval reconciles,
 *  - the store tears down one macrotask after its last subscriber leaves.
 * `useInboxUnreadCount` is the shell's `inboxUnread` badge source
 * (src/ports/badges.ts); `refreshInboxUnread` forces a recompute (after
 * "Mark all as read").
 */
import { useEffect, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { useAuthSafe } from '../../../auth/AuthProvider';
import { fetchGroups, fetchUnreadCount } from './chat-api';
import { subscribeChannel } from './realtime';

let currentCount = 0;
let initializedFor: string | null = null;
const listeners = new Set<() => void>();
let unsubDm: (() => void) | null = null;
let unsubGroups: (() => void) | null = null;
let groupKey = '';
let refetchTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;

export const UNREAD_RECONCILE_MS = 60_000;

function setCount(next: number) {
  if (next !== currentCount) {
    currentCount = next;
    listeners.forEach((l) => l());
  }
}

function client() {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

async function fetchTotal(userId: string): Promise<void> {
  if (initializedFor !== userId) return;
  const [direct, groups] = await Promise.all([fetchUnreadCount().catch(() => 0), fetchGroups().catch(() => [])]);
  if (initializedFor !== userId) return;
  setCount(direct + groups.reduce((sum, g) => sum + (g.unread_count || 0), 0));
  bindGroups(userId, groups.map((g) => g.id));
}

function scheduleRefetch(userId: string) {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    void fetchTotal(userId);
  }, 500);
}

function bindGroups(userId: string, ids: string[]) {
  const key = [...ids].sort().join(',');
  if (key === groupKey) return;
  groupKey = key;
  unsubGroups?.();
  unsubGroups = null;
  const sb = client();
  if (!sb || ids.length === 0) return;
  unsubGroups = subscribeChannel(sb, `chat_unread_badge_groups_${userId}`, [
    { kind: 'postgres', event: 'INSERT', table: 'chat_messages', filter: `group_id=in.(${ids.join(',')})`, handler: () => scheduleRefetch(userId) },
  ]);
}

function teardown() {
  unsubDm?.();
  unsubGroups?.();
  unsubDm = null;
  unsubGroups = null;
  groupKey = '';
  if (refetchTimer) clearTimeout(refetchTimer);
  if (periodicTimer) clearInterval(periodicTimer);
  refetchTimer = null;
  periodicTimer = null;
  initializedFor = null;
  currentCount = 0;
}

function init(userId: string) {
  if (initializedFor === userId) return;
  if (initializedFor) teardown();
  initializedFor = userId;
  const sb = client();
  if (sb) {
    unsubDm = subscribeChannel(sb, `chat_unread_badge_dm_${userId}`, [
      { kind: 'postgres', event: 'INSERT', table: 'chat_messages', filter: `receiver_id=eq.${userId}`, handler: () => scheduleRefetch(userId) },
    ]);
  }
  void fetchTotal(userId);
  periodicTimer = setInterval(() => void fetchTotal(userId), UNREAD_RECONCILE_MS);
}

/** Force an authoritative recompute (web `refresh`). */
export function refreshInboxUnread(): void {
  if (initializedFor) void fetchTotal(initializedFor);
}

/** The member's inbox unread total (0 signed out). */
export function useInboxUnreadCount(): number {
  const auth = useAuthSafe();
  const userId = auth?.user?.id ?? null;
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!userId) return undefined;
    if (teardownTimer) {
      clearTimeout(teardownTimer);
      teardownTimer = null;
    }
    init(userId);
    const cb = () => rerender((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
      if (listeners.size === 0) {
        if (teardownTimer) clearTimeout(teardownTimer);
        teardownTimer = setTimeout(() => {
          teardownTimer = null;
          if (listeners.size === 0) teardown();
        }, 0);
      }
    };
  }, [userId]);
  return userId ? currentCount : 0;
}

/** Test seam: drop the store. */
export function __resetInboxUnreadForTests(): void {
  if (teardownTimer) clearTimeout(teardownTimer);
  teardownTimer = null;
  listeners.clear();
  teardown();
}
