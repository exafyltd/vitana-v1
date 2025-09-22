import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export type PresenceStatus = 'online' | 'away' | 'offline';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  display_name?: string;
  avatar_url?: string;
  lastUpdate?: number; // Local timestamp for cache management
}

export interface PresenceConnection {
  status: ConnectionStatus;
  lastConnected?: number;
  reconnectAttempts: number;
}

export function useUserPresence(context: 'global' | 'tenant' = 'global') {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const [isActive, setIsActive] = useState(true);
  const [connection, setConnection] = useState<PresenceConnection>({
    status: 'connecting',
    reconnectAttempts: 0
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isActiveRef = useRef<boolean>(true);
  const connectionRef = useRef<PresenceConnection>(connection);
  const localCache = useRef<Map<string, UserPresence>>(new Map());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity
  const updateActivity = useCallback(() => {
    setIsActive(true);
  }, []);

  // Monitor user activity
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    let awayTimer: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(activityTimer);
      clearTimeout(awayTimer);
      
      // Set to away after 5 minutes of inactivity
      awayTimer = setTimeout(() => {
        setIsActive(false);
      }, 5 * 60 * 1000);
    };

    const handleActivity = () => {
      updateActivity();
      resetTimers();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Listen for window focus/blur
    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    resetTimers();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearTimeout(activityTimer);
      clearTimeout(awayTimer);
    };
  }, [updateActivity]);

  // Keep a ref of isActive to avoid resubscribing the channel
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Enhanced presence tracking with optimistic updates
  const trackPresence = useCallback(async () => {
    if (!user?.id) return;
    
    const status: PresenceStatus = document.hidden || !isActiveRef.current ? 'away' : 'online';
    const timestamp = new Date().toISOString();
    const now = Date.now();
    
    // Optimistic update - immediately update local state
    const optimisticPresence: UserPresence = {
      user_id: user.id,
      status,
      last_seen: timestamp,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      lastUpdate: now
    };
    
    localCache.current.set(user.id, optimisticPresence);
    setPresenceMap(prev => new Map(prev.set(user.id, optimisticPresence)));
    
    console.log(`[Presence] Optimistic update: ${user.id} as ${status} @ ${timestamp}`);
    
    let attempts = 0;
    const maxRetries = 3;
    
    while (attempts < maxRetries) {
      try {
        // Try realtime first
        if (channelRef.current && connectionRef.current.status === 'connected') {
          await channelRef.current.track({
            user_id: user.id,
            status,
            last_seen: timestamp,
            display_name: optimisticPresence.display_name,
            avatar_url: optimisticPresence.avatar_url,
          });
        }
        
        // Always update database as backup
        await supabase
          .from('thread_presence')
          .upsert({
            user_id: user.id,
            thread_id: '00000000-0000-0000-0000-000000000000',
            context: 'global',
            last_seen: timestamp,
          });
        
        console.log(`[Presence] Successfully tracked ${user.id} as ${status}`);
        break;
      } catch (err) {
        attempts++;
        console.error(`[Presence] Tracking failed (attempt ${attempts}/${maxRetries}):`, err);
        
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }
  }, [user?.id]);

  // Connection retry logic with exponential backoff
  const retryConnection = useCallback(() => {
    if (retryTimeoutRef.current) return;
    
    const attempts = connectionRef.current.reconnectAttempts;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    
    console.log(`[Presence] Retrying connection in ${delay}ms (attempt ${attempts + 1})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      setConnection(prev => ({ 
        ...prev, 
        status: 'connecting',
        reconnectAttempts: prev.reconnectAttempts + 1 
      }));
    }, delay);
  }, []);

  // Update connection ref when connection state changes
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // Set up enhanced Supabase realtime presence with monitoring
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `presence_global`;
    const channel = supabase.channel(channelName, {
      config: { 
        presence: { key: user.id },
        broadcast: { self: true }
      },
    });
    channelRef.current = channel;

    console.log(`[Presence] Setting up presence for user ${user.id} in channel ${channelName}`);

    // Load existing presence from database as fallback (last 24h)
    const loadDatabasePresence = async () => {
      try {
        const { data } = await supabase
          .from('thread_presence')
          .select('*')
          .eq('context', 'global')
          .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        if (data) {
          const dbPresenceMap = new Map<string, UserPresence>();
          data.forEach(item => {
            const minutesAway = Math.floor((Date.now() - new Date(item.last_seen).getTime()) / (1000 * 60));
            let status: PresenceStatus = 'offline';
            if (minutesAway <= 5) status = 'online';
            else if (minutesAway <= 15) status = 'away';
            dbPresenceMap.set(item.user_id, {
              user_id: item.user_id,
              status,
              last_seen: item.last_seen,
              display_name: 'User',
              avatar_url: undefined,
            });
          });
          setPresenceMap(prev => {
            const merged = new Map(prev);
            // Only add DB entries for users we don't already have via realtime
            dbPresenceMap.forEach((val, key) => {
              if (!merged.has(key)) merged.set(key, val);
            });
            return merged;
          });
          console.log(`[Presence] Loaded ${dbPresenceMap.size} users from database`);
        }
      } catch (error) {
        console.error('[Presence] Failed to load database presence:', error);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const newPresenceMap = new Map<string, UserPresence>();
        console.log(`[Presence] Syncing presence state:`, newState);
        Object.entries(newState).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence) {
            const lastSeen = new Date(presence.last_seen);
            const minutesAway = (Date.now() - lastSeen.getTime()) / (1000 * 60);
            let actualStatus: PresenceStatus = presence.status;
            if (minutesAway > 15) actualStatus = 'offline';
            else if (minutesAway > 5) actualStatus = 'away';
            newPresenceMap.set(String(key), {
              user_id: String(key),
              status: actualStatus,
              last_seen: presence.last_seen,
              display_name: presence.display_name,
              avatar_url: presence.avatar_url,
            });
            console.log(`[Presence] User ${key} (${presence.display_name}) is ${actualStatus}`);
          }
        });
        setPresenceMap(prev => {
          const merged = new Map(prev);
          newPresenceMap.forEach((val, key) => merged.set(key, val));
          return merged;
        });
        console.log(`[Presence] Updated presence map with ${newPresenceMap.size} users`);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        console.log(`[Presence] Channel subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setConnection(prev => ({ 
            ...prev, 
            status: 'connected',
            lastConnected: Date.now(),
            reconnectAttempts: 0
          }));
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          await trackPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnection(prev => ({ ...prev, status: 'disconnected' }));
          retryConnection();
        }
      });

    // Initial DB fallback load
    loadDatabasePresence();

    // Enhanced heartbeat with connection monitoring
    const heartbeat = setInterval(() => {
      if (connectionRef.current.status === 'connected') {
        trackPresence();
      } else if (connectionRef.current.status === 'disconnected') {
        retryConnection();
      }
    }, 30000);

    // Connection health check every 10s
    const healthCheck = setInterval(() => {
      const timeSinceLastConnection = connectionRef.current.lastConnected 
        ? Date.now() - connectionRef.current.lastConnected 
        : Infinity;
        
      if (timeSinceLastConnection > 60000 && connectionRef.current.status !== 'disconnected') {
        console.log('[Presence] Connection health check failed, marking as disconnected');
        setConnection(prev => ({ ...prev, status: 'disconnected' }));
      }
    }, 10000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(healthCheck);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, context]);

  // Update presence when activity or visibility changes
  useEffect(() => {
    trackPresence();
  }, [isActive, trackPresence]);

  useEffect(() => {
    const onVisibility = () => trackPresence();
    const onBeforeUnload = () => trackPresence();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [trackPresence]);

  const getUserPresence = useCallback((userId: string): UserPresence | null => {
    // First check local cache for most recent data
    const cached = localCache.current.get(userId);
    const mapData = presenceMap.get(userId);
    
    // Return cached data if it's more recent
    if (cached && mapData && cached.lastUpdate && cached.lastUpdate > (mapData.lastUpdate || 0)) {
      return cached;
    }
    
    return mapData || cached || null;
  }, [presenceMap]);

  const getStatusColor = useCallback((status: PresenceStatus): string => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'away':
        return 'bg-amber-500';
      case 'offline':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  }, []);

  const getConnectionStatusColor = useCallback((): string => {
    switch (connection.status) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
        return 'bg-amber-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  }, [connection.status]);

  const getStatusText = useCallback((presence: UserPresence | null): string => {
    if (!presence) return '';
    
    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const minutesAway = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    switch (presence.status) {
      case 'online':
        return 'Online';
      case 'away':
        return minutesAway < 60 ? `Away ${minutesAway}m ago` : `Away ${Math.floor(minutesAway / 60)}h ago`;
      case 'offline':
        if (minutesAway < 60) return `Last seen ${minutesAway}m ago`;
        if (minutesAway < 1440) return `Last seen ${Math.floor(minutesAway / 60)}h ago`;
        return `Last seen ${Math.floor(minutesAway / 1440)}d ago`;
      default:
        return '';
    }
  }, []);

  return {
    getUserPresence,
    getStatusColor,
    getStatusText,
    getConnectionStatusColor,
    isActive,
    connection,
    presenceCount: presenceMap.size,
  };
}