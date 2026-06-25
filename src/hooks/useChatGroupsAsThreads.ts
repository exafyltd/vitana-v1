/**
 * Adapts /api/v1/chat/groups results into GlobalMessageThread-shaped rows so
 * the existing Messages.tsx conversation list can render them alongside the
 * legacy global_message_threads. VTID-03089 Phase 2 follow-up.
 *
 * Thread ids are prefixed with `chat_group:` so click handlers can route the
 * selection to the standalone /inbox/g/<id> page (Phase 2 view) instead of
 * trying to open it inline with the global-message loader.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchGroups, type ChatGroup } from "./useChatApi";
import type { GlobalMessageThread, GlobalMessage } from "./useGlobalMessages";

const POLL_INTERVAL_MS = 30_000;

export const CHAT_GROUP_THREAD_PREFIX = "chat_group:";

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
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  // Holds the latest loader so the realtime effect can refetch without
  // re-subscribing whenever the loader closure changes.
  const loadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchGroups();
        if (!cancelled) {
          setGroups(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load groups");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    // Poll kept as a reconnect-safety fallback; realtime (below) handles the
    // common case so the list no longer relies on the 30s tick to feel live.
    const id = setInterval(load, POLL_INTERVAL_MS);
    loadRef.current = load;
    return () => {
      cancelled = true;
      loadRef.current = null;
      clearInterval(id);
    };
  }, [enabled]);

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
        () => { loadRef.current?.(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, groupIdsKey]);

  // Optimistically zero the unread badge for the given raw group ids (no prefix)
  // so "Mark all as read" clears them instantly, before the backend round-trip
  // and the next poll/realtime reconcile.
  const markGroupsReadLocal = useCallback((groupIds: string[]) => {
    if (groupIds.length === 0) return;
    const set = new Set(groupIds);
    setGroups((prev) =>
      prev.map((g) => (set.has(g.id) ? { ...g, unread_count: 0 } : g)),
    );
  }, []);

  // Force an authoritative refetch (reconcile after a bulk read).
  const reload = useCallback(() => {
    loadRef.current?.();
  }, []);

  const threads: GlobalMessageThread[] = groups.map(toThread);
  return { threads, groups, isLoading, error, markGroupsReadLocal, reload };
}
