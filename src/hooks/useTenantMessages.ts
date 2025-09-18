import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { useTenant } from "./useTenant";
import { supabase } from "@/integrations/supabase/client";
import type { MessageKind, SendMessageArgs } from './useHybridMessages';

export interface TenantMessage {
  id: string;
  thread_id?: string;
  tenant_id: string;
  sender_id: string;
  recipient_id?: string;
  body: string;
  message_type: string;
  content_data?: any;
  created_at: string;
  updated_at: string;
  sender?: {
    user_id: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

export interface TenantMessageThread {
  id: string;
  tenant_id: string;
  name?: string;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: {
    user_id: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    role: string;
    last_read_at?: string;
  }[];
  last_message?: TenantMessage;
  unread_count: number;
}

export function useTenantMessages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  const [messages, setMessages] = useState<TenantMessage[]>([]);
  const [threads, setThreads] = useState<TenantMessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  // Only use tenant messages for professional roles
  const isTenantContext = currentRole && ['patient', 'professional', 'staff', 'admin'].includes(currentRole);

  const fetchMessages = useCallback(async (threadId?: string, recipientId?: string) => {
    if (!user || !activeTenantId || !isTenantContext) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .order('created_at', { ascending: true });

      if (threadId) {
        query = query.eq('thread_id', threadId);
      } else if (recipientId) {
        query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`);
      }

      // Fetch messages with manual join for sender profile
      const { data: messagesData, error } = await query;
      if (error) throw error;

      // Get sender profiles separately
      const senderIds = messagesData?.map(m => m.sender_id) || [];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, avatar_url')
        .in('user_id', senderIds);

      // Combine messages with sender data
      const messagesWithSenders = messagesData?.map(message => ({
        ...message,
        sender: senderProfiles?.find(p => p.user_id === message.sender_id) || null
      })) || [];

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching tenant messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeTenantId, isTenantContext]);

  const fetchThreads = useCallback(async () => {
    if (!user || !activeTenantId || !isTenantContext) {
      setThreads([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Get threads where user is a participant
      const { data: threadData, error: threadError } = await supabase
        .from('message_threads')
        .select(`
          *,
          participants:thread_participants!inner(
            user_id,
            role,
            last_read_at,
            profile:profiles(
              full_name,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('tenant_id', activeTenantId)
        .eq('thread_participants.user_id', user.id)
        .eq('thread_participants.is_active', true)
        .order('updated_at', { ascending: false });

      if (threadError) throw threadError;

      // Get last message and unread count for each thread
      const threadsWithDetails = await Promise.all(
        (threadData || []).map(async (thread) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', thread.id)
            .eq('tenant_id', activeTenantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const userParticipant = thread.participants.find(
            (p: any) => p.user_id === user.id
          );
          const lastReadAt = userParticipant?.last_read_at;
          
          let unreadCount = 0;
          if (lastReadAt) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .eq('tenant_id', activeTenantId)
              .gt('created_at', lastReadAt);
            unreadCount = count || 0;
          } else {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .eq('tenant_id', activeTenantId);
            unreadCount = count || 0;
          }

          return {
            ...thread,
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      setThreads(threadsWithDetails);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tenant threads:', error);
      setThreads([]);
      setIsLoading(false);
    }
  }, [user, activeTenantId, isTenantContext]);

  // Legacy sendMessage for backwards compatibility - will be removed
  const sendMessageLegacy = useCallback(async (
    body: string,
    threadId?: string,
    recipientId?: string,
    messageType = 'text',
    contentData?: any
  ) => {
    if (!user || !activeTenantId || !isTenantContext) return;

    try {
      setIsSending(true);

      // Get user profile for optimistic update
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Create optimistic message
      const optimisticMessage: TenantMessage = {
        id: `temp-${Date.now()}`,
        body,
        sender_id: user.id,
        thread_id: threadId || null,
        recipient_id: recipientId || null,
        tenant_id: activeTenantId,
        message_type: messageType,
        content_data: contentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: userProfile || null
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          tenant_id: activeTenantId,
          thread_id: threadId,
          sender_id: user.id,
          recipient_id: recipientId,
          body,
          message_type: messageType,
          content_data: contentData,
        })
        .select()
        .single();

      if (error) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        throw error;
      }

      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...data, sender: userProfile } 
            : msg
        )
      );

      // Update thread's updated_at if thread exists
      if (threadId) {
        await supabase
          .from('message_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', threadId)
          .eq('tenant_id', activeTenantId);
      }

      // Only refresh threads (not messages since we have optimistic update)
      await fetchThreads();

      return data;
    } catch (error) {
      console.error('Error sending tenant message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, activeTenantId, isTenantContext, fetchThreads]);

  // New standardized sendMessage function
  const sendMessage = useCallback(async (args: SendMessageArgs) => {
    return sendMessageLegacy(args.content, args.threadId, args.recipientId, args.type || 'text', args.contentData);
  }, [sendMessageLegacy]);

  const createThread = useCallback(async (
    participantIds: string[],
    name?: string,
    type = 'direct'
  ) => {
    if (!user || !activeTenantId || !isTenantContext) return;

    try {
      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert({
          tenant_id: activeTenantId,
          created_by: user.id,
          name,
          type,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add participants
      const participantsToAdd = [user.id, ...participantIds.filter(id => id !== user.id)];
      const { error: participantsError } = await supabase
        .from('thread_participants')
        .insert(
          participantsToAdd.map(userId => ({
            thread_id: thread.id,
            user_id: userId,
            role: userId === user.id ? 'admin' : 'member',
          }))
        );

      if (participantsError) throw participantsError;

      await fetchThreads();
      return thread;
    } catch (error) {
      console.error('Error creating tenant thread:', error);
      throw error;
    }
  }, [user, activeTenantId, isTenantContext, fetchThreads]);

  // Debounced mark as read with smart timestamp checking
  const markAsReadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const markAsRead = useCallback(async (threadId: string) => {
    if (!user || !activeTenantId || !isTenantContext) return;

    // Clear existing timeout for this thread
    const existingTimeout = markAsReadTimeouts.current.get(threadId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce to avoid excessive calls
    const timeout = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        
        // Get current last_read_at to check if update is needed
        const { data: currentParticipant } = await supabase
          .from('thread_participants')
          .select('last_read_at')
          .eq('thread_id', threadId)
          .eq('user_id', user.id)
          .single();

        // Only update if new timestamp is later (idempotent)
        if (!currentParticipant?.last_read_at || new Date(now) > new Date(currentParticipant.last_read_at)) {
          const { error } = await supabase
            .from('thread_participants')
            .update({ last_read_at: now })
            .eq('thread_id', threadId)
            .eq('user_id', user.id);

          if (!error) {
            // Optimistically update local state immediately
            setThreads(prev => prev.map(thread => 
              thread.id === threadId 
                ? { ...thread, unread_count: 0 }
                : thread
            ));

            // Trigger real-time sync for other tabs/devices
            await supabase.channel('unread_sync').send({
              type: 'broadcast',
              event: 'thread_read',
              payload: { 
                threadId, 
                userId: user.id, 
                timestamp: now,
                context: 'tenant',
                tenantId: activeTenantId
              }
            });
          }
        }
      } catch (error) {
        console.error('Error marking tenant thread as read:', error);
      } finally {
        markAsReadTimeouts.current.delete(threadId);
      }
    }, 300); // 300ms debounce

    markAsReadTimeouts.current.set(threadId, timeout);
  }, [user, activeTenantId, isTenantContext]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !activeTenantId || !isTenantContext) return;

    const messageChannel = supabase
      .channel('tenant_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('New tenant message received:', payload.new);
          const newMessage = payload.new as any;
          
          // Only add messages for our tenant
          if (newMessage.tenant_id !== activeTenantId) return;
          
          // Skip if this is our own message (already handled by optimistic update)
          if (newMessage.sender_id === user.id) return;
          
          // Fetch sender profile for the new message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, display_name, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .single();

          // Add message with sender data
          setMessages(prev => [...prev, {
            ...newMessage,
            sender: senderProfile
          }]);
          
          // Also refresh threads to update last message
          fetchThreads();
        }
      )
      .subscribe();

    const threadChannel = supabase
      .channel('tenant_threads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads',
        },
        (payload) => {
          const thread = payload.new as any;
          if (thread && thread.tenant_id === activeTenantId) {
            fetchThreads();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(threadChannel);
    };
  }, [user, activeTenantId, isTenantContext, fetchThreads]);

  // Initial data fetch
  useEffect(() => {
    if (isTenantContext && activeTenantId) {
      fetchThreads();
    } else {
      setThreads([]);
      setMessages([]);
      setIsLoading(false);
    }
  }, [isTenantContext, activeTenantId, fetchThreads]);

  const startTyping = useCallback(async (threadId?: string) => {
    if (!user || !activeTenantId || !isTenantContext || !threadId) return;
    
    try {
      // Use realtime channel for typing instead of database
      const channel = supabase.channel(`tenant_typing_${threadId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          user_id: user.id,
          thread_id: threadId,
          tenant_id: activeTenantId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error starting typing:', error);
    }
  }, [user, activeTenantId, isTenantContext]);

  const stopTyping = useCallback(async (threadId?: string) => {
    if (!user || !activeTenantId || !isTenantContext || !threadId) return;
    
    try {
      // Use realtime channel for typing instead of database
      const channel = supabase.channel(`tenant_typing_${threadId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          user_id: user.id,
          thread_id: threadId,
          tenant_id: activeTenantId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  }, [user, activeTenantId, isTenantContext]);

  return {
    messages,
    threads,
    isLoading,
    isSending,
    typingUsers,
    sendMessage,
    createThread,
    markAsRead,
    fetchMessages,
    fetchThreads,
    refetchMessages: fetchMessages,
    startTyping,
    stopTyping,
    isTenantContext,
  };
}