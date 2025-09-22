import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  display_name?: string;
  avatar_url?: string;
}

export function useUserPresence(context: 'global' | 'tenant' = 'global') {
  const { user } = useAuth();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const [isActive, setIsActive] = useState(true);

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

  // Set up Supabase realtime presence
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `presence_global`; // Always use global presence channel
    const channel = supabase.channel(channelName);

    console.log(`[Presence] Setting up presence for user ${user.id} in channel ${channelName}`);

    // Track current user's presence and store in database
    const trackPresence = async () => {
      const status: PresenceStatus = document.hidden || !isActive ? 'away' : 'online';
      const timestamp = new Date().toISOString();
      
      console.log(`[Presence] Tracking presence: ${user.id} is ${status}`);
      
      // Track in realtime channel
      await channel.track({
        user_id: user.id,
        status,
        last_seen: timestamp,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
      });

      // Store in database as fallback
      try {
        await supabase
          .from('thread_presence')
          .upsert({
            user_id: user.id,
            thread_id: '00000000-0000-0000-0000-000000000000', // Global presence marker
            context: 'global',
            last_seen: timestamp
          });
      } catch (error) {
        console.error('[Presence] Failed to update database presence:', error);
      }
    };

    // Load existing presence from database as fallback
    const loadDatabasePresence = async () => {
      try {
        const { data } = await supabase
          .from('thread_presence')
          .select('*')
          .eq('context', 'global')
          .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        if (data) {
          const dbPresenceMap = new Map<string, UserPresence>();
          data.forEach(item => {
            if (item.user_id !== user.id) {
              const minutesAway = Math.floor((Date.now() - new Date(item.last_seen).getTime()) / (1000 * 60));
              let status: PresenceStatus = 'offline';
              
              if (minutesAway <= 5) status = 'online';
              else if (minutesAway <= 15) status = 'away';
              
              dbPresenceMap.set(item.user_id, {
                user_id: item.user_id,
                status,
                last_seen: item.last_seen,
                display_name: 'User', // Will be updated by realtime data
                avatar_url: null,
              });
            }
          });
          console.log(`[Presence] Loaded ${dbPresenceMap.size} users from database`);
          setPresenceMap(dbPresenceMap);
        }
      } catch (error) {
        console.error('[Presence] Failed to load database presence:', error);
      }
    };

    // Subscribe to presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const newPresenceMap = new Map<string, UserPresence>();

        console.log(`[Presence] Syncing presence state:`, newState);

        Object.entries(newState).forEach(([userId, presences]) => {
          const presence = (presences as any[])[0];
          // Include ALL users, not just others (removed userId !== user.id check)
          if (presence) {
            // Determine actual status based on last_seen
            const lastSeen = new Date(presence.last_seen);
            const now = new Date();
            const minutesAway = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

            let actualStatus: PresenceStatus = presence.status;
            if (minutesAway > 15) {
              actualStatus = 'offline';
            } else if (minutesAway > 5) {
              actualStatus = 'away';
            }

            newPresenceMap.set(userId, {
              user_id: userId,
              status: actualStatus,
              last_seen: presence.last_seen,
              display_name: presence.display_name,
              avatar_url: presence.avatar_url,
            });

            console.log(`[Presence] User ${userId} (${presence.display_name}) is ${actualStatus}`);
          }
        });

        console.log(`[Presence] Updated presence map with ${newPresenceMap.size} users`);
        setPresenceMap(newPresenceMap);
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
          await trackPresence();
        }
      });

    // Load database presence immediately
    loadDatabasePresence();

    // Update presence when activity changes
    trackPresence();

    // Set up periodic heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      trackPresence();
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      channel.unsubscribe();
    };
  }, [user?.id, context, isActive]);

  const getUserPresence = useCallback((userId: string): UserPresence | null => {
    return presenceMap.get(userId) || null;
  }, [presenceMap]);

  const getStatusColor = useCallback((status: PresenceStatus): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  }, []);

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
    isActive,
  };
}