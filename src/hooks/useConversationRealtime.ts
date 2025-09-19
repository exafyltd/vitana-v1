import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { GlobalMessage } from './useGlobalMessages';
import type { TenantMessage } from './useTenantMessages';
import { instrumentRealtimeEvent, trackSubscription } from '@/lib/diagnostics';
import { ProfileDirectory } from '@/lib/secure-accessors';

/**
 * Focused real-time hook for individual conversation threads
 * Provides optimized message streaming for active conversations
 */
export function useConversationRealtime(
  threadId: string | null, 
  context: 'global' | 'tenant' = 'global',
  activeTenantId?: string
) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(GlobalMessage | TenantMessage)[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch messages for specific thread with proper filtering
  const fetchThreadMessages = useCallback(async () => {
    if (!threadId || !user) {
      setMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      
      if (context === 'global') {
        const { data: messagesData, error } = await supabase
          .from('global_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get sender profiles using secure accessor
        const senderIds = messagesData?.map(m => m.sender_id) || [];
        const profiles = await ProfileDirectory.getMinimalByIds(senderIds);

        // Create profile map
        const profileMap: Record<string, any> = {};
        profiles.forEach(profile => {
          profileMap[profile.user_id] = {
            user_id: profile.user_id,
            display_name: profile.display_name || 'Unknown User',
            avatar_url: profile.avatar_url || null
          };
        });
        
        // Add self to profile map if needed
        senderIds.forEach(userId => {
          if (!profileMap[userId]) {
            profileMap[userId] = {
              user_id: userId,
              display_name: userId === user?.id ? 'You' : 'Unknown User',
              avatar_url: null
            };
          }
        });

        const messagesWithSenders = messagesData?.map(message => ({
          ...message,
          sender: profileMap[message.sender_id] || null
        })) || [];

        setMessages(messagesWithSenders);

      } else {
        // Tenant context
        if (!activeTenantId) return;

        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .eq('tenant_id', activeTenantId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get sender profiles
        const senderIds = messagesData?.map(m => m.sender_id) || [];
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, display_name, avatar_url')
          .in('user_id', senderIds);

        const messagesWithSenders = messagesData?.map(message => ({
          ...message,
          sender: senderProfiles?.find(p => p.user_id === message.sender_id) || null
        })) || [];

        setMessages(messagesWithSenders);
      }
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, context, activeTenantId, user]);

  // Set up focused real-time subscription for this specific thread
  useEffect(() => {
    if (!threadId || !user) {
      setMessages([]);
      return;
    }

    // Fetch initial messages
    fetchThreadMessages();

    // Set up real-time subscription filtered by thread_id
    const channelName = `thread_messages_${threadId}`;
    
    // Track subscription
    trackSubscription(`${channelName}:postgres_changes`, 'add');
    
    const messageChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: context === 'global' ? 'global_messages' : 'messages',
          filter: `thread_id=eq.${threadId}`
        },
        async (payload) => {
          console.log(`New ${context} message in thread ${threadId}:`, payload.new);
          const newMessage = payload.new as any;
          
          // Track the delivered event
          instrumentRealtimeEvent('delivered', {
            threadId,
            userId: newMessage.sender_id,
            content: newMessage.body
          });
          
          // Skip our own messages (handled by optimistic updates)
          if (newMessage.sender_id === user.id) return;

          // For tenant messages, verify tenant_id matches
          if (context === 'tenant' && newMessage.tenant_id !== activeTenantId) return;

          // Fetch sender profile using secure accessor
          let senderProfile = null;
          if (context === 'global') {
            const profiles = await ProfileDirectory.getMinimalByIds([newMessage.sender_id]);
            senderProfile = profiles[0] || {
              user_id: newMessage.sender_id,
              display_name: 'Unknown User',
              avatar_url: null
            };
          } else {
            // For tenant context, still query profiles directly since it's not in scope
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, full_name, display_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            senderProfile = profile || {
              user_id: newMessage.sender_id,
              display_name: 'Unknown User',
              avatar_url: null
            };
          }

          // Add the new message to local state
          setMessages(prev => [...prev, {
            ...newMessage,
            sender: senderProfile
          }]);
        }
      )
      .subscribe();

    return () => {
      trackSubscription(`${channelName}:postgres_changes`, 'remove');
      supabase.removeChannel(messageChannel);
    };
  }, [threadId, context, activeTenantId, user, fetchThreadMessages]);

  const addOptimisticMessage = useCallback((message: GlobalMessage | TenantMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateOptimisticMessage = useCallback((tempId: string, realMessage: GlobalMessage | TenantMessage) => {
    setMessages(prev => 
      prev.map(msg => msg.id === tempId ? realMessage : msg)
    );
  }, []);

  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
  }, []);

  return {
    messages,
    isLoading,
    fetchThreadMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
    removeOptimisticMessage,
  };
}