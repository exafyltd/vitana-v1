/**
 * Adapts /api/v1/chat/groups results into GlobalMessageThread-shaped rows so
 * the existing Messages.tsx conversation list can render them alongside the
 * legacy global_message_threads. VTID-03089 Phase 2 follow-up.
 *
 * Thread ids are prefixed with `chat_group:` so click handlers can route the
 * selection to the standalone /inbox/g/<id> page (Phase 2 view) instead of
 * trying to open it inline with the global-message loader.
 */

import { useEffect, useState } from "react";
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

  return {
    id: `${CHAT_GROUP_THREAD_PREFIX}${g.id}`,
    name: g.name,
    type: "group",
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
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  const threads: GlobalMessageThread[] = groups.map(toThread);
  return { threads, groups, isLoading, error };
}
