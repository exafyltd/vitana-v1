import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount } from "./useChatApi";

const POLL_INTERVAL = 60_000; // 60s — Realtime handles fast path

/**
 * Lightweight hook that uses Realtime for instant updates
 * and a visibility-aware setTimeout chain as fallback polling.
 */
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.warn("[useChatUnreadCount] fetch failed:", e);
    }
  }, [user]);

  // Visibility-aware recursive setTimeout polling
  useEffect(() => {
    if (!user) return;

    const schedule = () => {
      timeoutRef.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await refresh();
        }
        if (document.visibilityState === 'visible') {
          schedule();
        }
      }, POLL_INTERVAL);
    };

    // Initial fetch + start chain
    refresh();
    schedule();

    // Restart chain when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Immediate refresh on return + restart chain
        refresh();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        schedule();
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, refresh]);

  // Listen for new messages via Realtime → fetch authoritative count
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
          } catch (e) {
            setUnreadCount((prev) => prev + 1); // fallback only
          }
        }
      )
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
