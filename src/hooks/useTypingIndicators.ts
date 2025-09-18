import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

export function useTypingIndicators(threadId?: string, context: 'global' | 'tenant' = 'global') {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const startTyping = useCallback(async () => {
    if (!user || !threadId) return;
    
    try {
      const channelName = context === 'global' 
        ? `global_typing_${threadId}` 
        : `tenant_typing_${threadId}`;
      
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          user_id: user.id,
          thread_id: threadId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error starting typing:', error);
    }
  }, [user, threadId, context]);

  const stopTyping = useCallback(async () => {
    if (!user || !threadId) return;
    
    try {
      const channelName = context === 'global' 
        ? `global_typing_${threadId}` 
        : `tenant_typing_${threadId}`;
      
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
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  }, [user, threadId, context]);

  // Set up typing indicator subscriptions
  useEffect(() => {
    if (!user || !threadId) return;

    const channelName = context === 'global' 
      ? `global_typing_${threadId}` 
      : `tenant_typing_${threadId}`;

    const typingChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing_start' }, async (payload) => {
        const { user_id, timestamp } = payload.payload;
        
        // Don't show typing indicator for ourselves
        if (user_id === user.id) return;

        // Fetch user profile
        let userName = 'Unknown User';
        let userAvatar: string | undefined;

        if (context === 'global') {
          const { data: globalProfile } = await supabase
            .from('global_community_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', user_id)
            .maybeSingle();
          
          const { data: mainProfile } = await supabase
            .from('profiles')
            .select('display_name, full_name, avatar_url')
            .eq('user_id', user_id)
            .maybeSingle();

          userName = globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User';
          userAvatar = globalProfile?.avatar_url || mainProfile?.avatar_url || undefined;
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, full_name, avatar_url')
            .eq('user_id', user_id)
            .maybeSingle();

          userName = profile?.display_name || profile?.full_name || 'Unknown User';
          userAvatar = profile?.avatar_url || undefined;
        }

        setTypingUsers(prev => {
          const exists = prev.find(u => u.id === user_id);
          if (exists) return prev;
          
          return [...prev, {
            id: user_id,
            name: userName,
            avatar: userAvatar
          }];
        });

        // Auto-remove after 5 seconds if no stop event
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== user_id));
        }, 5000);
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const { user_id } = payload.payload;
        setTypingUsers(prev => prev.filter(u => u.id !== user_id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [user, threadId, context]);

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
}