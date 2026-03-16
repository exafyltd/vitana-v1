import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { VITANA_BOT_USER_ID, isVitanaBot } from '@/lib/vitanaBotIdentity';

/**
 * Module-level presence cache that survives component remounts / route changes.
 * This prevents the "grey dot on every screen switch" problem.
 */
const globalPresenceCache = new Map<string, UserPresence>();

export type PresenceStatus = 'online' | 'away' | 'offline';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  display_name?: string;
  avatar_url?: string;
  lastUpdate?: number;
}

export interface PresenceConnection {
  status: ConnectionStatus;
  lastConnected?: number;
  reconnectAttempts: number;
}

const DEBUG_PRESENCE = typeof localStorage !== 'undefined' && localStorage.getItem('debug_presence') === 'true';

/**
 * Normalize any raw presence status string + staleness into one of three canonical states.
 * - online/active/available → online (if last_seen within 10 min)
 * - idle/away → away (if last_seen within 10 min)
 * - everything else, null, or stale → offline
 */
export function normalizePresenceStatus(
  raw: string | null | undefined,
  lastSeen: string | null | undefined
): PresenceStatus {
  if (!lastSeen) return 'offline';

  const minutesSince = (Date.now() - new Date(lastSeen).getTime()) / 60000;

  // Stale guard: >30 min without heartbeat → offline regardless
  if (minutesSince > 30) return 'offline';
  // Stale-ish: >15 min → away regardless of claimed status
  if (minutesSince > 15) return 'away';

  switch (raw) {
    case 'online':
    case 'active':
    case 'available':
      return 'online';
    case 'idle':
    case 'away':
      return 'away';
    default:
      return 'offline';
  }
}

/** Throttle wrapper — fires at most once per `ms` */
function throttle(fn: () => void, ms: number) {
  let lastCall = 0;
  return () => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn();
    }
  };
}

export function useUserPresence(context: 'global' | 'tenant' = 'global') {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(() => new Map(globalPresenceCache));
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
  /** Ref to latest presenceMap for debounce comparison without stale closures */
  const presenceMapRef = useRef<Map<string, UserPresence>>(presenceMap);

  // Keep ref in sync
  useEffect(() => {
    presenceMapRef.current = presenceMap;
  }, [presenceMap]);

  /**
   * Debounced merge: only update state if at least one user's normalized status actually changed.
   * Also writes through to the module-level cache so next mount is instant.
   */
  const mergePresenceIfChanged = useCallback((incoming: Map<string, UserPresence>) => {
    const current = presenceMapRef.current;
    let hasChange = false;

    incoming.forEach((val, key) => {
      const existing = current.get(key);
      if (!existing || existing.status !== val.status) {
        hasChange = true;
      }
    });

    if (!hasChange && incoming.size <= current.size) return;

    setPresenceMap(prev => {
      const merged = new Map(prev);
      incoming.forEach((val, key) => {
        merged.set(key, val);
        globalPresenceCache.set(key, val); // write-through to module cache
      });
      return merged;
    });
  }, []);

  // Track user activity
  const updateActivity = useCallback(() => {
    setIsActive(true);
  }, []);

  // Monitor user activity — throttled to 5s minimum gap
  useEffect(() => {
    let awayTimer: NodeJS.Timeout;

    const resetTimers = () => {
      clearTimeout(awayTimer);
      awayTimer = setTimeout(() => {
        setIsActive(false);
      }, 5 * 60 * 1000);
    };

    const handleActivity = throttle(() => {
      updateActivity();
      resetTimers();
    }, 5000);

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

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
      clearTimeout(awayTimer);
    };
  }, [updateActivity]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Enhanced presence tracking with optimistic updates
  const trackPresence = useCallback(async () => {
    if (!user?.id) return;
    
    const status: PresenceStatus = document.hidden || !isActiveRef.current ? 'away' : 'online';
    const timestamp = new Date().toISOString();
    const now = Date.now();
    
    const optimisticPresence: UserPresence = {
      user_id: user.id,
      status,
      last_seen: timestamp,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      lastUpdate: now
    };
    
    localCache.current.set(user.id, optimisticPresence);
    globalPresenceCache.set(user.id, optimisticPresence);
    setPresenceMap(prev => new Map(prev.set(user.id, optimisticPresence)));
    
    if (DEBUG_PRESENCE) console.log(`[Presence] Optimistic update: ${user.id} as ${status} @ ${timestamp}`);
    
    let attempts = 0;
    const maxRetries = 3;
    
    while (attempts < maxRetries) {
      try {
        if (channelRef.current && connectionRef.current.status === 'connected') {
          await channelRef.current.track({
            user_id: user.id,
            status,
            last_seen: timestamp,
            display_name: optimisticPresence.display_name,
            avatar_url: optimisticPresence.avatar_url,
          });
        }
        
        await supabase
          .from('thread_presence')
          .upsert({
            user_id: user.id,
            thread_id: '00000000-0000-0000-0000-000000000000',
            context: 'global',
            last_seen: timestamp,
          }, {
            onConflict: 'user_id,thread_id,context'
          });
        
        if (DEBUG_PRESENCE) console.log(`[Presence] Successfully tracked ${user.id} as ${status}`);
        break;
      } catch (err) {
        attempts++;
        if (DEBUG_PRESENCE) console.error(`[Presence] Tracking failed (attempt ${attempts}/${maxRetries}):`, err);
        
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
    
    if (DEBUG_PRESENCE) console.log(`[Presence] Retrying connection in ${delay}ms (attempt ${attempts + 1})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      setConnection(prev => ({ 
        ...prev, 
        status: 'connecting',
        reconnectAttempts: prev.reconnectAttempts + 1 
      }));
    }, delay);
  }, []);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // Set up Supabase realtime presence
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

    if (DEBUG_PRESENCE) console.log(`[Presence] Setting up presence for user ${user.id} in channel ${channelName}`);

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
            const status = normalizePresenceStatus('online', item.last_seen);
            dbPresenceMap.set(item.user_id, {
              user_id: item.user_id,
              status,
              last_seen: item.last_seen,
              display_name: 'User',
              avatar_url: undefined,
            });
          });
          // Only merge entries not already present (realtime takes priority)
          setPresenceMap(prev => {
            const merged = new Map(prev);
            dbPresenceMap.forEach((val, key) => {
              if (!merged.has(key)) {
                merged.set(key, val);
                globalPresenceCache.set(key, val);
              }
            });
            return merged;
          });
          if (DEBUG_PRESENCE) console.log(`[Presence] Loaded ${dbPresenceMap.size} users from database`);
        }
      } catch (error) {
        console.error('[Presence] Failed to load database presence:', error);
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const newPresenceMap = new Map<string, UserPresence>();
        if (DEBUG_PRESENCE) console.log(`[Presence] Syncing presence state:`, newState);
        Object.entries(newState).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence) {
            const normalizedStatus = normalizePresenceStatus(presence.status, new Date().toISOString());
            newPresenceMap.set(String(key), {
              user_id: String(key),
              status: normalizedStatus,
              last_seen: presence.last_seen,
              display_name: presence.display_name,
              avatar_url: presence.avatar_url,
            });
            if (DEBUG_PRESENCE) console.log(`[Presence] User ${key} (${presence.display_name}) is ${normalizedStatus}`);
          }
        });
        // Debounced merge — skip if nothing actually changed
        mergePresenceIfChanged(newPresenceMap);
        if (DEBUG_PRESENCE) console.log(`[Presence] Updated presence map with ${newPresenceMap.size} users`);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (DEBUG_PRESENCE) console.log('[Presence] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (DEBUG_PRESENCE) console.log('[Presence] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (DEBUG_PRESENCE) console.log(`[Presence] Channel subscription status: ${status}`);
        
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

    loadDatabasePresence();

    // Heartbeat: 30s setTimeout chain, pauses when hidden
    let heartbeatTimeout: NodeJS.Timeout | null = null;
    const scheduleHeartbeat = () => {
      heartbeatTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          if (connectionRef.current.status === 'connected') {
            trackPresence();
          } else if (connectionRef.current.status === 'disconnected') {
            retryConnection();
          }
        }
        if (document.visibilityState === 'visible') {
          scheduleHeartbeat();
        }
      }, 30_000);
    };

    // Health check: 60s setTimeout chain, pauses when hidden
    let healthTimeout: NodeJS.Timeout | null = null;
    const scheduleHealthCheck = () => {
      healthTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          const timeSinceLastConnection = connectionRef.current.lastConnected 
            ? Date.now() - connectionRef.current.lastConnected 
            : Infinity;
          if (timeSinceLastConnection > 60000 && connectionRef.current.status !== 'disconnected') {
            if (DEBUG_PRESENCE) console.log('[Presence] Connection health check failed, marking as disconnected');
            setConnection(prev => ({ ...prev, status: 'disconnected' }));
          }
        }
        if (document.visibilityState === 'visible') {
          scheduleHealthCheck();
        }
      }, 60_000);
    };

    scheduleHeartbeat();
    scheduleHealthCheck();

    // Restart chains on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
        scheduleHeartbeat();
        scheduleHealthCheck();
      } else {
        if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        if (healthTimeout) clearTimeout(healthTimeout);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      if (healthTimeout) clearTimeout(healthTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, context]);

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
    // Vitana bot is always online — it's a 24/7 AI assistant
    if (isVitanaBot(userId)) {
      return {
        user_id: userId,
        status: 'online',
        last_seen: new Date().toISOString(),
        display_name: 'Vitana',
      };
    }
    const cached = localCache.current.get(userId);
    const mapData = presenceMap.get(userId);
    if (cached && mapData && cached.lastUpdate && cached.lastUpdate > (mapData.lastUpdate || 0)) {
      return cached;
    }
    return mapData || null;
  }, [presenceMap]);

  const getOnlineUsers = useCallback((): UserPresence[] => {
    return Array.from(presenceMap.values()).filter(p => p.status === 'online');
  }, [presenceMap]);

  const getOnlineCount = useCallback((): number => {
    return Array.from(presenceMap.values()).filter(p => p.status === 'online').length;
  }, [presenceMap]);

  const presenceCount = presenceMap.size;

  const getStatusColor = useCallback((status: PresenceStatus): string => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-amber-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  }, []);

  const getStatusText = useCallback((presence: UserPresence | null): string => {
    if (!presence) return 'Offline';
    switch (presence.status) {
      case 'online': return 'Active';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  }, []);

  const getConnectionStatusColor = useCallback((): string => {
    switch (connection.status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-amber-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }, [connection.status]);

  return {
    presenceMap,
    presenceCount,
    isActive,
    connection,
    getUserPresence,
    getOnlineUsers,
    getOnlineCount,
    getStatusColor,
    getStatusText,
    getConnectionStatusColor,
    trackPresence,
  };
}
