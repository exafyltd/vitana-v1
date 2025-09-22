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

    const channelName = `presence_${context}`;
    const channel = supabase.channel(channelName);

    // Track current user's presence
    const trackPresence = async () => {
      const status: PresenceStatus = document.hidden || !isActive ? 'away' : 'online';
      
      await channel.track({
        user_id: user.id,
        status,
        last_seen: new Date().toISOString(),
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
      });
    };

    // Subscribe to presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const newPresenceMap = new Map<string, UserPresence>();

        Object.entries(newState).forEach(([userId, presences]) => {
          const presence = (presences as any[])[0];
          if (presence && userId !== user.id) {
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
          }
        });

        setPresenceMap(newPresenceMap);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });

    // Update presence when activity changes
    if (channel) {
      trackPresence();
    }

    // Cleanup on unmount
    return () => {
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