import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount } from "./useChatApi";

const POLL_INTERVAL = 60_000;

// ── Singleton shared store ──────────────────────────────────────────
let currentCount = 0;
let initializedForUserId: string | null = null;
const listeners = new Set<() => void>();

let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let broadcastChannel: ReturnType<typeof supabase.channel> | null = null;

function notify() {
  listeners.forEach((cb) => cb());
}

function setCount(next: number) {
  if (next !== currentCount) {
    currentCount = next;
    notify();
  }
}

async function refreshCount() {
  try {
    const count = await fetchUnreadCount();
    setCount(count);
  } catch (e) {
    console.warn("[useChatUnreadCount] fetch failed:", e);
  }
}

function teardown() {
  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (broadcastChannel) {
    supabase.removeChannel(broadcastChannel);
    broadcastChannel = null;
  }
  window.removeEventListener("chat-unread-refresh", handleWindowRefresh);
  document.removeEventListener("visibilitychange", handleVisibility);
  initializedForUserId = null;
  currentCount = 0;
}

function handleWindowRefresh() {
  refreshCount();
}

function handleVisibility() {
  if (document.visibilityState === "visible") {
    refreshCount();
  }
}

function init(userId: string) {
  if (initializedForUserId === userId) return;
  // If switching users, tear down previous
  if (initializedForUserId) teardown();
  initializedForUserId = userId;

  // Initial fetch
  refreshCount();

  // Polling
  const tick = () => {
    if (document.visibilityState === "visible") {
      refreshCount();
    }
    pollTimeout = setTimeout(tick, POLL_INTERVAL);
  };
  pollTimeout = setTimeout(tick, POLL_INTERVAL);

  // Visibility
  document.addEventListener("visibilitychange", handleVisibility);

  // Window event for same-tab sync
  window.addEventListener("chat-unread-refresh", handleWindowRefresh);

  // Realtime: new messages & notifications
  realtimeChannel = supabase
    .channel("chat_unread_badge")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${userId}` },
      async () => {
        try {
          const count = await fetchUnreadCount();
          setCount(count);
        } catch {
          setCount(currentCount + 1);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${userId}` },
      async (payload) => {
        const notif = payload.new as { type?: string };
        if (notif?.type !== "new_chat_message") return;
        try {
          const count = await fetchUnreadCount();
          setCount(count);
        } catch {
          setCount(currentCount + 1);
        }
      }
    )
    .subscribe();

  // Broadcast: cross-tab thread_read / unread_change
  broadcastChannel = supabase
    .channel("chat_sidebar_unread_sync")
    .on("broadcast", { event: "thread_read" }, async (payload) => {
      if (payload.payload?.userId === userId) {
        try {
          const count = await fetchUnreadCount();
          setCount(count);
        } catch {
          setCount(Math.max(0, currentCount - 1));
        }
      }
    })
    .on("broadcast", { event: "unread_change" }, async (payload) => {
      if (payload.payload?.userId === userId) {
        try {
          const count = await fetchUnreadCount();
          setCount(count);
        } catch {
          setCount(currentCount + 1);
        }
      }
    })
    .subscribe();
}

// ── Public hook (thin subscriber) ───────────────────────────────────
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [, rerender] = useState(0);

  // Initialize singleton for this user
  useEffect(() => {
    if (!user) return;
    init(user.id);

    // Subscribe to shared store
    const cb = () => rerender((n) => n + 1);
    listeners.add(cb);

    return () => {
      listeners.delete(cb);
      // Tear down when last subscriber leaves
      if (listeners.size === 0) {
        teardown();
      }
    };
  }, [user]);

  const refresh = useCallback(() => {
    refreshCount();
  }, []);

  const decrementBy = useCallback((n: number) => {
    setCount(Math.max(0, currentCount - n));
  }, []);

  return { unreadCount: currentCount, refresh, decrementBy };
}
