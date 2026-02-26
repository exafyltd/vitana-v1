import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnreadCount } from "./useChatApi";

/**
 * Lightweight hook that polls gateway unread count + listens to Realtime
 */
export function useChatUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.warn("[useChatUnreadCount] fetch failed:", e);
    }
  }, [user]);

  // Poll on mount + 30s interval
  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  // Listen for new messages via Realtime → increment
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
        () => {
          setUnreadCount((prev) => prev + 1);
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
