import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showAppilixFallbackNotification } from '@/lib/appilixNotificationFallback';
import { useAuth } from '@/context/AuthProvider';

export interface VitanaNotification {
  id: string;
  user_id: string;
  tenant_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  live_room_notifications: boolean;
  match_notifications: boolean;
  recommendation_notifications: boolean;
  task_notifications: boolean;
  community_notifications: boolean;
  memory_notifications: boolean;
  dnd_enabled: boolean;
  dnd_start_time: string | null;
  dnd_end_time: string | null;
}

const DEFAULT_PREFS: NotificationPreferences = {
  push_enabled: true, live_room_notifications: true, match_notifications: true,
  recommendation_notifications: true, task_notifications: true, community_notifications: true,
  memory_notifications: false, dnd_enabled: false, dnd_start_time: null, dnd_end_time: null,
};

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || '';

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<VitanaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const jwt = await getJwt();
      if (!jwt) return;
      const res = await fetch(`${GATEWAY_URL}/api/v1/notifications?limit=${limit}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const { data } = await res.json();
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: VitanaNotification) => !n.read_at).length);
    } catch (err) {
      console.error('[Notifications] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const jwt = await getJwt();
      if (!jwt) return;
      const res = await fetch(`${GATEWAY_URL}/api/v1/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const { count } = await res.json();
      setUnreadCount(count || 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const channel = supabase
      .channel('user_notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as VitanaNotification;
        if (newNotif.user_id !== user.id) return;
        setNotifications((prev) => [newNotif, ...prev.slice(0, limit - 1)]);
        setUnreadCount((prev) => prev + 1);
        // Appilix fallback: show browser notification when backgrounded
        showAppilixFallbackNotification(newNotif);
      })
      .subscribe();
    channelRef.current = channel;
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for chat-triggered notification clears
    const handleNotifRefresh = () => { fetchNotifications(); };
    window.addEventListener('notifications-refresh', handleNotifRefresh);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      clearInterval(interval);
      window.removeEventListener('notifications-refresh', handleNotifRefresh);
    };
  }, [user, fetchNotifications, fetchUnreadCount, limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const jwt = await getJwt();
    if (!jwt) return;
    await fetch(`${GATEWAY_URL}/api/v1/notifications/${notificationId}/read`, {
      method: 'POST', headers: { Authorization: `Bearer ${jwt}` },
    });
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const jwt = await getJwt();
    if (!jwt) return;
    await fetch(`${GATEWAY_URL}/api/v1/notifications/mark-all-read`, {
      method: 'POST', headers: { Authorization: `Bearer ${jwt}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    let removed: VitanaNotification | undefined;
    setNotifications((prev) => {
      removed = prev.find((n) => n.id === notificationId);
      if (removed && !removed.read_at) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== notificationId);
    });

    const jwt = await getJwt();
    if (!jwt) return;
    const res = await fetch(`${GATEWAY_URL}/api/v1/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) {
      // Rollback on failure
      if (removed) {
        setNotifications((prev) => [removed!, ...prev]);
        if (!removed.read_at) setUnreadCount((c) => c + 1);
      }
    }
  }, []);

  /**
   * Delete all notifications for the user.
   * Pass `{ types: [...] }` to limit the delete to a specific category's types,
   * or `{ readOnly: true }` to keep unread items.
   */
  const deleteAll = useCallback(
    async (opts?: { types?: string[]; readOnly?: boolean }) => {
      const jwt = await getJwt();
      if (!jwt) return;

      const params = new URLSearchParams();
      if (opts?.readOnly) params.set('read_only', 'true');
      if (opts?.types && opts.types.length > 0) params.set('types', opts.types.join(','));
      const qs = params.toString();
      const url = `${GATEWAY_URL}/api/v1/notifications${qs ? `?${qs}` : ''}`;

      const prev = notifications;
      const prevUnread = unreadCount;

      // Optimistic update
      const matches = (n: VitanaNotification) => {
        if (opts?.readOnly && !n.read_at) return false;
        if (opts?.types && opts.types.length > 0 && !opts.types.includes(n.type)) return false;
        return true;
      };
      const remaining = notifications.filter((n) => !matches(n));
      setNotifications(remaining);
      setUnreadCount(remaining.filter((n) => !n.read_at).length);

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        setNotifications(prev);
        setUnreadCount(prevUnread);
      }
    },
    [notifications, unreadCount]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    refetch: fetchNotifications,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadPrefs(); }, [user]);

  const loadPrefs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from('user_notification_preferences')
        .select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setPrefs({
          push_enabled: data.push_enabled ?? true, live_room_notifications: data.live_room_notifications ?? true,
          match_notifications: data.match_notifications ?? true, recommendation_notifications: data.recommendation_notifications ?? true,
          task_notifications: data.task_notifications ?? true, community_notifications: data.community_notifications ?? true,
          memory_notifications: data.memory_notifications ?? false, dnd_enabled: data.dnd_enabled ?? false,
          dnd_start_time: data.dnd_start_time ?? null, dnd_end_time: data.dnd_end_time ?? null,
        });
      }
    } catch {} finally { setLoading(false); }
  };

  const updatePref = async (field: keyof NotificationPreferences, value: any) => {
    if (!user) return;
    const updated = { ...prefs, [field]: value };
    setPrefs(updated);
    try {
      const { error } = await (supabase as any).from('user_notification_preferences').upsert(
        { user_id: user.id, ...updated, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    } catch (err) {
      setPrefs(prefs); // rollback
      throw err;
    }
  };

  return { prefs, loading, updatePref };
}
