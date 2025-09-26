import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { GlobalMessage } from './useGlobalMessages';
import type { TenantMessage } from './useTenantMessages';

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

        // Get sender profiles
        const senderIds = messagesData?.map(m => m.sender_id) || [];
        const { data: globalProfiles } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', senderIds);

        const { data: mainProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, full_name, avatar_url')
          .in('user_id', senderIds);

        // Create profile map
        const profileMap: Record<string, any> = {};
        senderIds.forEach(userId => {
          const globalProfile = globalProfiles?.find(p => p.user_id === userId);
          const mainProfile = mainProfiles?.find(p => p.user_id === userId);
          
          profileMap[userId] = {
            user_id: userId,
            display_name: globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User',
            avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null
          };
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

    // Clear messages immediately when threadId changes
    setMessages([]);
    
    // Fetch initial messages
    fetchThreadMessages();

    // Set up real-time subscription filtered by thread_id
    const channelName = `thread_messages_${threadId}`;
    
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
          
          // Skip our own messages (handled by optimistic updates)
          if (newMessage.sender_id === user.id) return;

          // For tenant messages, verify tenant_id matches
          if (context === 'tenant' && newMessage.tenant_id !== activeTenantId) return;

          // Fetch sender profile
          let senderProfile = null;
          if (context === 'global') {
            const { data: globalProfile } = await supabase
              .from('global_community_profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            const { data: mainProfile } = await supabase
              .from('profiles')
              .select('user_id, display_name, full_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            senderProfile = {
              user_id: newMessage.sender_id,
              display_name: globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User',
              avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null
            };
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, full_name, display_name, avatar_url')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();

            senderProfile = profile;
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