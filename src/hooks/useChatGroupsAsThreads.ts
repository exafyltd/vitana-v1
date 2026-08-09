/**
 * Adapts /api/v1/chat/groups results into GlobalMessageThread-shaped rows so
 * the existing Messages.tsx conversation list can render them alongside the
 * legacy global_message_threads. VTID-03089 Phase 2 follow-up.
 *
 * Thread ids are prefixed with `chat_group:` so click handlers can route the
 * selection to the standalone /inbox/g/<id> page (Phase 2 view) instead of
 * trying to open it inline with the global-message loader.
 *
 * Backed by React Query so the group rows survive navigation: previously this
 * was a bare useState/useEffect that started every mount at [] + isLoading,
 * which made the whole inbox list visibly "reload" each time the user came
 * back to /inbox even though the DM threads were cached.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { fetchGroups, type ChatGroup } from "./useChatApi";
import type { GlobalMessageThread, GlobalMessage } from "./useGlobalMessages";

// Reconnect-safety fallback for the group thread list. Tightened 30s → 10s so
// the inbox last-message / unread badge for groups still converges quickly when
// realtime misses an event on flaky mobile networks.
const POLL_INTERVAL_MS = 10_000;

export const CHAT_GROUP_THREAD_PREFIX = "chat_group:";

export const chatGroupsQueryKey = (userId: string | undefined) =>
  ["chat-groups", userId ?? "anonymous"] as const;

export function isChatGroupThreadId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(CHAT_GROUP_THREAD_PREFIX);
}

export function chatGroupIdFromThreadId(id: string): string {
  return id.replace(CHAT_GROUP_THREAD_PREFIX, "");
}

function toThread(g: ChatGroup): GlobalMessageThread {
  const lm = g.last_message as { id?: string; sender_id?: string; content?: string; created_at?: string } | null | undefined;
  const last: GlobalMessage | undefined = lm
    ? {
        id: lm.id || `${g.id}-last`,
        thread_id: `${CHAT_GROUP_THREAD_PREFIX}${g.id}`,
        sender_id: lm.sender_id || "",
        body: lm.content || "",
        message_type: "text",
        created_at: lm.created_at || g.created_at,
        updated_at: lm.created_at || g.created_at,
      }
    : undefined;

  const avatarUrl =
    g.metadata && typeof g.metadata === "object" && typeof (g.metadata as any).avatar_url === "string"
      ? String((g.metadata as any).avatar_url)
      : undefined;

  return {
    id: `${CHAT_GROUP_THREAD_PREFIX}${g.id}`,
    name: g.name,
    type: "group",
    avatar_url: avatarUrl,
    created_by: g.metadata && typeof g.metadata === "object" && "seeded_by" in g.metadata ? String((g.metadata as any).seeded_by) : "system",
    created_at: g.created_at,
    updated_at: last?.created_at || g.created_at,
    participants: [],
    last_message: last,
    unread_count: g.unread_count || 0,
  };
}

export function useChatGroupsAsThreads(enabled: boolean = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = chatGroupsQueryKey(user?.id);

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchGroups,
    enabled: enabled && !!user,
    // Cached rows paint instantly on re-navigation; realtime + the poll below
    // reconcile in the background without any visible loading state.
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Poll kept as a reconnect-safety fallback; realtime (below) handles the
    // common case so the list no longer relies on the 30s tick to feel live.
    refetchInterval: POLL_INTERVAL_MS,
  });

  // Realtime: a new message in any group the user belongs to refreshes the
  // list (last message + unread badge). Requires public.chat_messages in the
  // supabase_realtime publication (migration 20260618110546).
  const groupIdsKey = useMemo(
    () => groups.map((g) => g.id).sort().join(","),
    [groups],
  );

  useEffect(() => {
    if (!enabled || !groupIdsKey) return;
    const channel = supabase
      .channel(`chat_groups_threads_${groupIdsKey.slice(0, 24)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `group_id=in.(${groupIdsKey})` },
        () => { queryClient.invalidateQueries({ queryKey }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // queryKey is derived from user.id which is stable for a session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, groupIdsKey, queryClient, user?.id]);

  // Catch silent websocket drops from backgrounding: the realtime channel
  // above is known to suspend when a WebView-wrapped mobile app is
  // backgrounded (locked screen, app switch, push notification), so a group
  // that received new messages while backgrounded won't have bumped to the
  // top by the time the app is reopened. Mirrors the same guard already in
  // useGlobalMessages.ts for DM threads.
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryClient, user?.id]);

  // Optimistically zero the unread badge for the given raw group ids (no prefix)
  // so "Mark all as read" clears them instantly, before the backend round-trip
  // and the next poll/realtime reconcile.
  const markGroupsReadLocal = useCallback((groupIds: string[]) => {
    if (groupIds.length === 0) return;
    const set = new Set(groupIds);
    queryClient.setQueryData<ChatGroup[]>(queryKey, (prev) =>
      (prev ?? []).map((g) => (set.has(g.id) ? { ...g, unread_count: 0 } : g)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  // Force an authoritative refetch (reconcile after a bulk read).
  const reload = useCallback(() => {
    refetch();
  }, [refetch]);

  const threads: GlobalMessageThread[] = useMemo(
    () => (enabled ? groups.map(toThread) : []),
    [enabled, groups],
  );
  return {
    threads,
    groups: enabled ? groups : [],
    isLoading: enabled ? isLoading : false,
    error: error ? (error as Error).message : null,
    markGroupsReadLocal,
    reload,
  };
}
