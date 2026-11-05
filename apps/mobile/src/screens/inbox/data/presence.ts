/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — member presence
 * for the conversation-card dot, re-implemented natively from the web
 * `src/hooks/useUserPresence.ts` (class B: web Supabase client + realtime):
 *  - the realtime presence channel `presence_global` (presence key = the
 *    member); a `sync` merges every tracked member as `online` / `away`,
 *  - `thread_presence` rows of the global context seen in the last 24 h
 *    (`select('*').eq('context','global').gte('last_seen', …)`), normalised by
 *    staleness, fill members the channel does not know,
 *  - once subscribed the member tracks themself (`channel.track`) and upserts
 *    their `thread_presence` heartbeat row (onConflict user_id,thread_id,context),
 *    again every 30 s while the app is in the foreground (web: tab visible);
 *    a backgrounded app tracks `away` (web `document.hidden`),
 *  - the Vitana bot is always online.
 * One store per signed-in member (the web's module-level cache), shared by
 * every dot; it tears down one macrotask after its last subscriber leaves.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../auth/client';
import { useAuthSafe } from '../../../auth/AuthProvider';
import { isVitanaBot } from './threads-model';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PresenceStatus = 'online' | 'away' | 'offline';

export const PRESENCE_CHANNEL = 'presence_global';
export const PRESENCE_HEARTBEAT_MS = 30_000;
export const GLOBAL_PRESENCE_THREAD_ID = '00000000-0000-0000-0000-000000000000';

/** Web `normalizePresenceStatus`: >30 min → offline, >15 min → away, else by the raw status. */
export function normalizePresenceStatus(raw: string | null | undefined, lastSeen: string | null | undefined, now = Date.now()): PresenceStatus {
  if (!lastSeen) return 'offline';
  const minutesSince = (now - new Date(lastSeen).getTime()) / 60000;
  if (minutesSince > 30) return 'offline';
  if (minutesSince > 15) return 'away';
  switch (raw) {
    case 'online':
    case 'active':
    case 'available':
      return 'online';
    case 'idle':
    case 'away':
      return 'away';
    default:
      return 'offline';
  }
}

const statuses = new Map<string, PresenceStatus>();
const listeners = new Set<() => void>();
let startedFor: string | null = null;
let channel: RealtimeChannel | null = null;
let channelClient: SupabaseClient | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;

function emit() {
  listeners.forEach((l) => l());
}

function merge(entries: Array<[string, PresenceStatus]>, overwrite: boolean) {
  let changed = false;
  for (const [id, status] of entries) {
    if (!overwrite && statuses.has(id)) continue;
    if (statuses.get(id) !== status) {
      statuses.set(id, status);
      changed = true;
    }
  }
  if (changed) emit();
}

/** Web `document.hidden`: the app is not in the foreground. */
function appHidden(): boolean {
  return AppState.currentState === 'background' || AppState.currentState === 'inactive';
}

async function track(sb: SupabaseClient, user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) {
  const status: PresenceStatus = appHidden() ? 'away' : 'online';
  const lastSeen = new Date().toISOString();
  merge([[user.id, status]], true);
  try {
    if (channel && subscribed) {
      await (channel as any).track({
        user_id: user.id,
        status,
        last_seen: lastSeen,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
      });
    }
    await sb.from('thread_presence').upsert({ user_id: user.id, thread_id: GLOBAL_PRESENCE_THREAD_ID, context: 'global', last_seen: lastSeen }, { onConflict: 'user_id,thread_id,context' });
  } catch {
    // best effort, as on web (it retries; the next heartbeat does here)
  }
}

async function loadDatabasePresence(sb: SupabaseClient) {
  try {
    const { data } = await sb
      .from('thread_presence')
      .select('*')
      .eq('context', 'global')
      .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const rows = (data as Array<{ user_id: string; last_seen: string }> | null) ?? [];
    merge(
      rows.map((r) => [r.user_id, normalizePresenceStatus('online', r.last_seen)]),
      false,
    );
  } catch {
    // the dots stay as they are (web logs)
  }
}

function start(user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) {
  const sb = getSupabase();
  startedFor = user.id;
  void loadDatabasePresence(sb);
  if (typeof (sb as any)?.channel !== 'function') return;
  const ch = sb.channel(PRESENCE_CHANNEL, { config: { presence: { key: user.id }, broadcast: { self: true } } });
  channel = ch;
  channelClient = sb;
  (ch as any).on('presence', { event: 'sync' }, () => {
    const state = (ch as any).presenceState?.() ?? {};
    const now = new Date().toISOString();
    merge(
      Object.entries(state as Record<string, any[]>)
        .filter(([, list]) => Array.isArray(list) && list[0])
        .map(([key, list]) => [String(key), normalizePresenceStatus(list[0].status, now)]),
      true,
    );
  });
  ch.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') {
      subscribed = true;
      void track(sb, user);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      subscribed = false;
    }
  });
  heartbeat = setInterval(() => {
    if (!appHidden()) void track(sb, user);
  }, PRESENCE_HEARTBEAT_MS);
  appStateSub = AppState.addEventListener('change', () => void track(sb, user));
}

function stop() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  appStateSub?.remove();
  appStateSub = null;
  if (channel && channelClient) void channelClient.removeChannel(channel);
  channel = null;
  channelClient = null;
  subscribed = false;
  startedFor = null;
}

/** The dot's status for `userId` (offline while unknown; Vitana always online). */
export function usePresenceStatus(userId: string | undefined): PresenceStatus {
  const user = useAuthSafe()?.user ?? null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) return undefined;
    if (teardownTimer) {
      clearTimeout(teardownTimer);
      teardownTimer = null;
    }
    if (startedFor !== user.id) {
      if (startedFor) stop();
      statuses.clear();
      start(user as any);
    }
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
      if (listeners.size === 0) {
        teardownTimer = setTimeout(() => {
          teardownTimer = null;
          if (listeners.size === 0) stop();
        }, 0);
      }
    };
  }, [user]);

  if (!userId) return 'offline';
  if (isVitanaBot(userId)) return 'online';
  return statuses.get(userId) ?? 'offline';
}

/** Test seam: a fresh app session (no store, no cache). */
export function __resetPresenceForTests(): void {
  if (teardownTimer) clearTimeout(teardownTimer);
  teardownTimer = null;
  stop();
  statuses.clear();
  listeners.clear();
}
