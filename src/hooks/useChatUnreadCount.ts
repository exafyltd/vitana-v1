import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// ── Singleton shared store ──────────────────────────────────────────
let currentCount = 0;
let initializedForUserId: string | null = null;
const listeners = new Set<() => void>();

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function notify() {
  listeners.forEach((cb) => cb());
}

function setCount(next: number) {
  if (next !== currentCount) {
    currentCount = next;
    notify();
  }
}

function handleCountUpdate(e: Event) {
  const count = (e as CustomEvent).detail?.count ?? 0;
  setCount(count);
}

function teardown() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  window.removeEventListener("chat-unread-count-update", handleCountUpdate);
  initializedForUserId = null;
  currentCount = 0;
}

function init(userId: string) {
  if (initializedForUserId === userId) return;
  if (initializedForUserId) teardown();
  initializedForUserId = userId;

  // Listen for thread-derived count updates from useGlobalMessages / useTenantMessages
  window.addEventListener("chat-unread-count-update", handleCountUpdate);

  // Realtime: new incoming messages trigger thread refetch (which will recompute count)
  realtimeChannel = supabase
    .channel("chat_unread_badge")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${userId}` },
      () => {
        // Trigger thread list refetch — the thread query will recompute unread and dispatch the event
        window.dispatchEvent(new Event("chat-threads-refetch"));
      }
    )
    .subscribe();
}

// ── Public hook (thin subscriber) ───────────────────────────────────
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [, rerender] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    init(user.id);

    const cb = () => rerender((n) => n + 1);
    listeners.add(cb);

    // Listen for refetch requests from realtime
    const handleRefetch = () => {
      queryClient.invalidateQueries({ queryKey: ["global-threads", user.id] });
    };
    window.addEventListener("chat-threads-refetch", handleRefetch);

    return () => {
      listeners.delete(cb);
      window.removeEventListener("chat-threads-refetch", handleRefetch);
      if (listeners.size === 0) {
        teardown();
      }
    };
  }, [user, queryClient]);

  const refresh = useCallback(() => {
    // Trigger thread refetch which will recompute and dispatch count
    window.dispatchEvent(new Event("chat-threads-refetch"));
  }, []);

  const decrementBy = useCallback((n: number) => {
    setCount(Math.max(0, currentCount - n));
  }, []);

  return { unreadCount: currentCount, refresh, decrementBy };
}
