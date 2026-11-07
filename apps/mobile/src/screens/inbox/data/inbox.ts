/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox list's
 * data hooks, re-implemented natively (plan decision 2, sparring R1-F2: the
 * web hooks are class B):
 *  - `useInboxThreads(context)` — `useHybridMessages` routed to the Community
 *    (`useGlobalMessages` threads, query key ["global-threads", user]) or the
 *    Network (`useTenantMessages` threads, ["tenant-threads", user, tenant])
 *    list, plus `useChatGroupsAsThreads` (["chat-groups", user], 10 s poll,
 *    realtime on group messages) merged first in the Community context
 *    (Messages.tsx:121-130). Live updates: a DM addressed to the member bumps
 *    its row (or refetches for a new peer), a dropped channel engages the
 *    6 s fallback poll, returning to the foreground refetches (the web
 *    `visibilitychange`).
 *  - `markAllRead(...)` — the web `markAllAsRead` (global: gateway
 *    `/chat/read-all`, the `global_thread_participants` watermark, the chat
 *    notifications; tenant: the `thread_participants` watermark + the
 *    `unread_sync` broadcast) and the chat-group reads (`markGroupRead`).
 *  - `useUnreadSync(onRead, onChange)` — `src/hooks/useUnreadSync.ts`.
 *  - `useProgressiveCount(total)` — `src/hooks/useProgressiveCount.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { useTenant } from '../../../identity/TenantProvider';
import { fetchGroups, markAllChatRead, markGroupRead, type ChatGroup } from './chat-api';
import { fetchGlobalThreads } from './global-threads';
import { fetchTenantThreads } from './tenant-threads';
import { broadcast, subscribeChannel } from './realtime';
import { CHAT_GROUP_THREAD_PREFIX, chatGroupIdFromThreadId, isChatGroupThreadId, type ConversationFilter, type InboxContext, type InboxMessage, type InboxThread } from './threads-model';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const THREADS_STALE_MS = 10 * 60 * 1000;
export const GROUPS_POLL_MS = 10_000;
export const FALLBACK_POLL_MS = 6000;

export const globalThreadsKey = (userId: string | undefined) => ['global-threads', userId] as const;
export const tenantThreadsKey = (userId: string | undefined, tenantId: string | null) => ['tenant-threads', userId, tenantId] as const;
export const chatGroupsKey = (userId: string | undefined) => ['chat-groups', userId ?? 'anonymous'] as const;

/** `useChatGroupsAsThreads` `toThread`. */
export function groupToThread(g: ChatGroup): InboxThread {
  const lm = g.last_message;
  const last: InboxMessage | undefined = lm
    ? { id: lm.id || `${g.id}-last`, thread_id: `${CHAT_GROUP_THREAD_PREFIX}${g.id}`, sender_id: lm.sender_id || '', body: lm.content || '', message_type: 'text', created_at: lm.created_at || g.created_at, updated_at: lm.created_at || g.created_at }
    : undefined;
  const meta = g.metadata && typeof g.metadata === 'object' ? (g.metadata as Record<string, unknown>) : null;
  return {
    id: `${CHAT_GROUP_THREAD_PREFIX}${g.id}`,
    name: g.name,
    type: 'group',
    avatar_url: typeof meta?.avatar_url === 'string' ? meta.avatar_url : undefined,
    created_by: meta && 'seeded_by' in meta ? String(meta.seeded_by) : 'system',
    created_at: g.created_at,
    updated_at: last?.created_at || g.created_at,
    participants: [],
    last_message: last,
    unread_count: g.unread_count || 0,
  };
}

function sbOrNull(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export function useInboxThreads(context: InboxContext, vitanaWelcome: string) {
  const { user, loading: authLoading } = useAuth();
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const isGlobal = context === 'global';

  const globalKey = globalThreadsKey(userId);
  const global = useQuery({
    queryKey: globalKey,
    queryFn: () => fetchGlobalThreads(getSupabase(), userId as string, queryClient.getQueryData<InboxThread[]>(globalKey), vitanaWelcome),
    enabled: !!userId && isGlobal,
    staleTime: THREADS_STALE_MS,
  });

  const tenant = useQuery({
    queryKey: tenantThreadsKey(userId, activeTenantId),
    queryFn: () => fetchTenantThreads(getSupabase(), userId as string, activeTenantId as string),
    enabled: !!userId && !!activeTenantId && !isGlobal,
    staleTime: 2 * 60 * 1000,
  });

  const groupsKey = chatGroupsKey(userId);
  const groups = useQuery({
    queryKey: groupsKey,
    queryFn: fetchGroups,
    enabled: !!userId && isGlobal,
    staleTime: 2 * 60 * 1000,
    refetchInterval: GROUPS_POLL_MS,
  });

  // Realtime: a DM to the member updates its row; a channel drop engages the fallback poll.
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const sb = sbOrNull();
    if (!sb || !userId || !isGlobal) return undefined;
    return subscribeChannel(
      sb,
      `global_threads_${userId}`,
      [
        {
          kind: 'postgres',
          event: 'INSERT',
          table: 'chat_messages',
          filter: `receiver_id=eq.${userId}`,
          handler: (payload: any) => {
            const raw = payload?.new;
            if (!raw || raw.group_id) return;
            const peerId: string = raw.sender_id;
            queryClient.setQueryData<InboxThread[]>(globalThreadsKey(userId), (prev) => {
              const existing = prev?.find((t) => t.id === peerId);
              if (!prev || !existing) {
                void queryClient.invalidateQueries({ queryKey: globalThreadsKey(userId) });
                return prev;
              }
              const msg: InboxMessage = { id: raw.id, thread_id: peerId, sender_id: peerId, body: raw.content, message_type: raw.message_type || 'text', created_at: raw.created_at, updated_at: raw.created_at };
              return [{ ...existing, updated_at: raw.created_at, last_message: msg, unread_count: existing.unread_count + 1 }, ...prev.filter((t) => t.id !== peerId)];
            });
          },
        },
      ],
      (status) => {
        if (status === 'SUBSCRIBED') setConnected(true);
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') setConnected(false);
      },
    );
  }, [userId, isGlobal, queryClient]);

  useEffect(() => {
    if (!userId || !isGlobal || connected) return undefined;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void queryClient.refetchQueries({ queryKey: globalThreadsKey(userId) });
    }, FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [userId, isGlobal, connected, queryClient]);

  // Group rows: a new message in any of the member's groups refreshes them.
  const groupIdsKey = useMemo(() => (groups.data ?? []).map((g) => g.id).sort().join(','), [groups.data]);
  useEffect(() => {
    const sb = sbOrNull();
    if (!sb || !isGlobal || !groupIdsKey) return undefined;
    return subscribeChannel(sb, `chat_groups_threads_${groupIdsKey.slice(0, 24)}`, [
      { kind: 'postgres', event: 'INSERT', table: 'chat_messages', filter: `group_id=in.(${groupIdsKey})`, handler: () => void queryClient.invalidateQueries({ queryKey: chatGroupsKey(userId) }) },
    ]);
  }, [isGlobal, groupIdsKey, queryClient, userId]);

  // Tenant: a new message refreshes the Network list.
  useEffect(() => {
    const sb = sbOrNull();
    if (!sb || !userId || !activeTenantId || isGlobal) return undefined;
    return subscribeChannel(sb, 'tenant_messages_realtime', [
      { kind: 'postgres', event: 'INSERT', table: 'messages', handler: () => void queryClient.invalidateQueries({ queryKey: tenantThreadsKey(userId, activeTenantId) }) },
    ]);
  }, [userId, activeTenantId, isGlobal, queryClient]);

  // Back in the foreground: refetch (web visibilitychange).
  useEffect(() => {
    if (!userId) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (isGlobal) {
        void queryClient.invalidateQueries({ queryKey: globalThreadsKey(userId) });
        void queryClient.invalidateQueries({ queryKey: chatGroupsKey(userId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: tenantThreadsKey(userId, activeTenantId) });
      }
    });
    return () => sub.remove();
  }, [userId, isGlobal, activeTenantId, queryClient]);

  const threads = useMemo(() => {
    if (!isGlobal) return tenant.data ?? [];
    return [...(groups.data ?? []).map(groupToThread), ...(global.data ?? [])];
  }, [isGlobal, tenant.data, groups.data, global.data]);

  const active = isGlobal ? global : tenant;
  const markGroupsReadLocal = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      queryClient.setQueryData<ChatGroup[]>(chatGroupsKey(userId), (prev) => (prev ?? []).map((g) => (set.has(g.id) ? { ...g, unread_count: 0 } : g)));
    },
    [queryClient, userId],
  );

  /** "Mark all as read" for the context and filter (Messages.tsx:310-338 + the hooks' markAllAsRead). */
  const markAllRead = useCallback(
    async (filter: ConversationFilter) => {
      if (!userId) return;
      const sb = getSupabase();
      const doDirect = filter === 'all' || filter === 'direct';
      const doGroups = filter === 'all' || filter === 'groups';
      const now = new Date().toISOString();
      if (isGlobal) {
        const cached = queryClient.getQueryData<InboxThread[]>(globalThreadsKey(userId)) ?? [];
        const participantThreadIds = cached.filter((t) => (t.type === 'group' ? doGroups : doDirect)).map((t) => t._legacyThreadId || t.id).filter(Boolean);
        if (doDirect) await markAllChatRead();
        if (participantThreadIds.length > 0) {
          await (sb.from('global_thread_participants').update({ last_read_at: now }).eq('user_id', userId).in('thread_id', participantThreadIds) as any);
        }
        try {
          await (sb.from('user_notifications').update({ read_at: now }).eq('type', 'new_chat_message').eq('user_id', userId).is('read_at', null) as any);
        } catch {
          // best effort, as on web
        }
        queryClient.setQueryData<InboxThread[]>(globalThreadsKey(userId), (prev) => prev?.map((t) => ((t.type === 'group' ? doGroups : doDirect) ? { ...t, unread_count: 0 } : t)));
        if (doGroups) {
          const groupIds = threads.filter((t) => isChatGroupThreadId(t.id) && (t.unread_count || 0) > 0).map((t) => chatGroupIdFromThreadId(t.id));
          if (groupIds.length > 0) {
            markGroupsReadLocal(groupIds);
            await Promise.allSettled(groupIds.map((id) => markGroupRead(id)));
            void groups.refetch();
          }
        }
      } else if (activeTenantId) {
        const key = tenantThreadsKey(userId, activeTenantId);
        const cached = queryClient.getQueryData<InboxThread[]>(key) ?? [];
        const ids = cached.filter((t) => (filter === 'direct' ? t.type !== 'group' : filter === 'groups' ? t.type === 'group' : true)).map((t) => t.id);
        if (ids.length === 0) return;
        const { error } = (await (sb.from('thread_participants').update({ last_read_at: now }).eq('user_id', userId).in('thread_id', ids) as any)) ?? {};
        if (error) throw error;
        queryClient.setQueryData<InboxThread[]>(key, (prev) => prev?.map((t) => (ids.includes(t.id) ? { ...t, unread_count: 0 } : t)));
        await broadcast(sb, 'unread_sync', 'unread_change', { userId, context: 'tenant', tenantId: activeTenantId });
        setTimeout(() => void tenant.refetch(), 500);
      }
    },
    [userId, isGlobal, activeTenantId, queryClient, threads, markGroupsReadLocal, groups, tenant],
  );

  return {
    threads,
    userId,
    // Until the session resolves the list is loading (the web has the user before it mounts).
    isLoading: active.isLoading || authLoading || !userId,
    isFetching: active.isFetching,
    refetch: () => void active.refetch(),
    markAllRead,
  };
}

/** `src/hooks/useUnreadSync.ts`: cross-device read state for the open list. */
export function useUnreadSync(onThreadRead: (threadId: string, ctx: InboxContext) => void, onUnreadChange: (threadId: string, ctx: InboxContext) => void) {
  const { user } = useAuth();
  const userId = user?.id;
  const onRead = useRef(onThreadRead);
  const onChange = useRef(onUnreadChange);
  onRead.current = onThreadRead;
  onChange.current = onUnreadChange;
  useEffect(() => {
    const sb = sbOrNull();
    if (!sb || !userId) return undefined;
    const offSync = subscribeChannel(
      sb,
      'unread_sync',
      [
        {
          kind: 'broadcast',
          event: 'thread_read',
          handler: (p: any) => {
            const { threadId, userId: from, context } = p?.payload ?? {};
            if (from === userId) onRead.current(threadId, context);
          },
        },
        {
          kind: 'broadcast',
          event: 'unread_change',
          handler: (p: any) => {
            const { threadId, context } = p?.payload ?? {};
            onChange.current(threadId, context);
          },
        },
      ],
      undefined,
      false,
    );
    const offParticipants = subscribeChannel(sb, 'participant_changes', [
      { kind: 'postgres', event: 'UPDATE', table: 'thread_participants', filter: `user_id=eq.${userId}`, handler: (p: any) => onChange.current(p?.new?.thread_id, 'tenant') },
      { kind: 'postgres', event: 'UPDATE', table: 'global_thread_participants', filter: `user_id=eq.${userId}`, handler: (p: any) => onChange.current(p?.new?.thread_id, 'global') },
    ]);
    return () => {
      offSync();
      offParticipants();
    };
  }, [userId]);
}

/**
 * `src/hooks/useProgressiveCount.ts`: how many rows to render now — starts at
 * `min(total, initial)` and grows by `step` per tick until `total`, so a long
 * inbox paints its first rows at once; a new `resetKey` starts small again.
 */
export function useProgressiveCount(total: number, { initial = 24, step = 40, resetKey }: { initial?: number; step?: number; resetKey?: unknown } = {}): number {
  const [count, setCount] = useState(() => Math.min(total, initial));
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setCount(Math.min(total, initial));
  }
  useEffect(() => {
    if (count >= total) return undefined;
    const id = setTimeout(() => setCount((c) => Math.min(total, Math.max(c, Math.min(total, initial)) + step)), 50);
    return () => clearTimeout(id);
  }, [count, total, initial, step]);
  return Math.min(total, Math.max(count, Math.min(total, initial)));
}
