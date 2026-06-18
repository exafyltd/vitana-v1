import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount, fetchGroups } from "@/hooks/useChatApi";

// ── Self-sufficient unread badge store ──────────────────────────────
//
// Previously this hook started at 0 and waited for `chat-unread-count-update`
// events dispatched by the inbox hooks (useGlobalMessages / useTenantMessages).
// That made the footer badge stale whenever the user was NOT on /inbox (Home,
// Events, …) because no mounted hook ever recomputed the count, and it also
// MISSED group chat unreads (those events only summed direct/global threads).
//
// Now the badge owns the count itself:
//   • initial fetch on mount  = direct unread (gateway /chat/unread-count)
//                             + Σ group unread (gateway /chat/groups)
//   • realtime chat_messages INSERTs (direct + group) trigger a refetch
//   • inbox optimistic events are treated as *refetch triggers* (their numeric
//     payload under-counts groups, so we never trust it as the value)
//   • a 60s safety interval reconciles against the backend
//
// The count is authoritative and independent of which screen is mounted.

let currentCount = 0;
let initializedForUserId: string | null = null;
const listeners = new Set<() => void>();

let dmChannel: ReturnType<typeof supabase.channel> | null = null;
let groupChannel: ReturnType<typeof supabase.channel> | null = null;
let subscribedGroupKey = ""; // sorted group-id set the group channel is bound to
let refetchTimer: ReturnType<typeof setTimeout> | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;

function notify() {
  listeners.forEach((cb) => cb());
}

function setCount(next: number) {
  if (next !== currentCount) {
    currentCount = next;
    notify();
  }
}

// Authoritative recompute: direct unread + every group's unread.
async function fetchTotal(userId: string) {
  if (initializedForUserId !== userId) return;
  const [direct, groups] = await Promise.all([
    fetchUnreadCount().catch(() => 0),
    fetchGroups().catch(() => []),
  ]);
  if (initializedForUserId !== userId) return; // user changed while in flight
  const groupTotal = groups.reduce((sum, g) => sum + (g.unread_count || 0), 0);
  setCount(direct + groupTotal);
  ensureGroupSubscription(userId, groups.map((g) => g.id));
}

function scheduleRefetch(userId: string) {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    void fetchTotal(userId);
  }, 500);
}

// (Re)bind the group realtime channel to the caller's current group set.
// Group messages have receiver_id = null, so the direct-DM filter never
// catches them; we filter by group_id instead.
function ensureGroupSubscription(userId: string, groupIds: string[]) {
  const key = [...groupIds].sort().join(",");
  if (key === subscribedGroupKey) return;
  subscribedGroupKey = key;

  if (groupChannel) {
    supabase.removeChannel(groupChannel);
    groupChannel = null;
  }
  if (groupIds.length === 0) return;

  groupChannel = supabase
    .channel(`chat_unread_badge_groups_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `group_id=in.(${groupIds.join(",")})`,
      },
      () => scheduleRefetch(userId),
    )
    .subscribe();
}

function handleTrigger() {
  if (initializedForUserId) scheduleRefetch(initializedForUserId);
}

function teardown() {
  if (dmChannel) {
    supabase.removeChannel(dmChannel);
    dmChannel = null;
  }
  if (groupChannel) {
    supabase.removeChannel(groupChannel);
    groupChannel = null;
  }
  subscribedGroupKey = "";
  if (refetchTimer) {
    clearTimeout(refetchTimer);
    refetchTimer = null;
  }
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
  window.removeEventListener("chat-unread-count-update", handleTrigger);
  window.removeEventListener("chat-threads-refetch", handleTrigger);
  initializedForUserId = null;
  currentCount = 0;
}

function init(userId: string) {
  if (initializedForUserId === userId) return;
  if (initializedForUserId) teardown();
  initializedForUserId = userId;

  // Inbox hooks still dispatch these on optimistic cache updates / reads.
  // Treat them as "something changed, reconcile" triggers — never as the
  // value, because those payloads only sum direct/global threads (no groups).
  window.addEventListener("chat-unread-count-update", handleTrigger);
  window.addEventListener("chat-threads-refetch", handleTrigger);

  // Direct DM realtime: new message addressed to me → reconcile.
  dmChannel = supabase
    .channel(`chat_unread_badge_dm_${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${userId}` },
      () => scheduleRefetch(userId),
    )
    .subscribe();

  // Initial authoritative fetch + group-channel binding.
  void fetchTotal(userId);

  // Safety net: realtime can drop events (reconnects, channel errors), so
  // reconcile against the backend periodically regardless of screen.
  periodicTimer = setInterval(() => void fetchTotal(userId), 60_000);
}

// ── Public hook (thin subscriber) ───────────────────────────────────
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!user) return;
    init(user.id);

    const cb = () => rerender((n) => n + 1);
    listeners.add(cb);

    return () => {
      listeners.delete(cb);
      if (listeners.size === 0) {
        teardown();
      }
    };
  }, [user]);

  // Force an immediate authoritative recompute (e.g. after marking read).
  const refresh = useCallback(() => {
    if (initializedForUserId) void fetchTotal(initializedForUserId);
  }, []);

  // Optimistic local decrement for snappy UX; the next reconcile corrects it.
  const decrementBy = useCallback((n: number) => {
    setCount(Math.max(0, currentCount - n));
  }, []);

  return { unreadCount: currentCount, refresh, decrementBy };
}
