import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { g1Analytics } from '@/lib/analytics-events';
import { instrumentRealtimeEvent, trackChannelStatus, trackSubscription } from '@/lib/diagnostics';
import { ProfileDirectory } from '@/lib/secure-accessors';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

export function useTypingIndicators(threadId?: string, context: 'global' | 'tenant' = 'global') {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [userCache] = useState<Map<string, TypingUser>>(new Map());

  const startTyping = useCallback(async () => {
    if (!user || !threadId) return;
    
    try {
      // Use new channel format: typing:{threadId}
      const channelName = `typing:${threadId}`;
      
      // Get user profile info to include in payload
      let userName = 'Unknown User';
      let userAvatar: string | undefined;

      if (context === 'global') {
        // For global context, try to get profile via secure accessor
        try {
          const profiles = await ProfileDirectory.getMinimalByIds([user.id]);
          if (profiles.length > 0) {
            userName = profiles[0].display_name || 'Unknown User';
            userAvatar = profiles[0].avatar_url || undefined;
          } else {
            // Fallback to main profile for self
            const { data: mainProfile } = await supabase
              .from('profiles')
              .select('display_name, full_name, avatar_url')
              .eq('user_id', user.id)
              .maybeSingle();
            userName = mainProfile?.display_name || mainProfile?.full_name || 'Unknown User';
            userAvatar = mainProfile?.avatar_url || undefined;
          }
        } catch (error) {
          console.warn('Could not fetch global profile for typing, using fallback');
          userName = 'Unknown User';
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, full_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        userName = profile?.display_name || profile?.full_name || 'Unknown User';
        userAvatar = profile?.avatar_url || undefined;
      }
      
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          user_id: user.id,
          thread_id: threadId,
          name: userName,
          avatar: userAvatar,
          timestamp: Date.now()
        }
      });

      // Track diagnostics
      instrumentRealtimeEvent('typing_start', { threadId, userId: user.id });
      trackChannelStatus(channelName, 'connected');

      // Track analytics
      g1Analytics.autopilotActionExecuted('typing_start');
    } catch (error) {
      console.error('Error starting typing:', error);
    }
  }, [user, threadId, context]);

  const stopTyping = useCallback(async () => {
    if (!user || !threadId) return;
    
    try {
      const channelName = `typing:${threadId}`;
      
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          user_id: user.id,
          thread_id: threadId,
          timestamp: Date.now()
        }
      });

      // Track diagnostics
      instrumentRealtimeEvent('typing_stop', { threadId, userId: user.id });

      // Track analytics
      g1Analytics.autopilotActionExecuted('typing_stop');
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  }, [user, threadId, context]);

  // Set up typing indicator subscriptions
  useEffect(() => {
    if (!user || !threadId) return;

    const channelName = `typing:${threadId}`;

    // Track subscription
    trackSubscription(`typing:${threadId}`, 'add');

    const typingChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        const { user_id, name, avatar } = payload.payload;
        
        // Don't show typing indicator for ourselves
        if (user_id === user.id) return;

        // Use data from payload (no DB query needed)
        const typingUser: TypingUser = {
          id: user_id,
          name: name || 'Unknown User',
          avatar: avatar
        };

        // Cache the user data
        userCache.set(user_id, typingUser);

        setTypingUsers(prev => {
          const exists = prev.find(u => u.id === user_id);
          if (exists) return prev;
          
          return [...prev, typingUser];
        });

        // Auto-remove after 1.5 seconds if no stop event (WhatsApp style)
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== user_id));
        }, 1500);
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const { user_id } = payload.payload;
        setTypingUsers(prev => prev.filter(u => u.id !== user_id));
      })
      .subscribe();

    return () => {
      trackSubscription(`typing:${threadId}`, 'remove');
      supabase.removeChannel(typingChannel);
    };
  }, [user, threadId, context, userCache]);

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
}