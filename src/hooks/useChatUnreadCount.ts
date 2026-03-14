import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount } from "./useChatApi";

const POLL_INTERVAL = 60_000; // 60s — Realtime handles fast path

/**
 * Lightweight hook that uses Realtime for instant updates
 * and resilient polling fallback.
 */
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.warn("[useChatUnreadCount] fetch failed:", e);
    }
  }, [user]);

  // Polling fallback (keeps schedule alive even if visibility events are flaky on mobile webviews)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      if (document.visibilityState === "visible") {
        await refresh();
      }

      if (!cancelled) {
        timeoutRef.current = setTimeout(tick, POLL_INTERVAL);
      }
    };

    refresh();
    timeoutRef.current = setTimeout(tick, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [user, refresh]);

  // Realtime inserts from chat and notifications → fetch authoritative unread count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat_unread_badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async () => {
          try {
            const count = await fetchUnreadCount();
            setUnreadCount(count);
          } catch {
            setUnreadCount((prev) => prev + 1); // fallback only
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notif = payload.new as { type?: string };
          if (notif?.type !== "new_chat_message") return;

          try {
            const count = await fetchUnreadCount();
            setUnreadCount(count);
          } catch {
            setUnreadCount((prev) => prev + 1); // fallback only
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Listen for thread_read broadcasts to instantly clear sidebar badge after reading
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chat_unread_read_sync")
      .on("broadcast", { event: "thread_read" }, async (payload) => {
        const { userId } = payload.payload;
        if (userId === user.id) {
          // Re-fetch authoritative count after marking messages as read
          try {
            const count = await fetchUnreadCount();
            setUnreadCount(count);
          } catch {
            // Optimistic: decrement by 1 as fallback
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Expose a decrement for when user reads a conversation
  const decrementBy = useCallback((n: number) => {
    setUnreadCount((prev) => Math.max(0, prev - n));
  }, []);

  return { unreadCount, refresh, decrementBy };
}

