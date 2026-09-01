import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { useTenant } from "./useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarEvents } from "./useCalendarEvents";
import { messageCache } from "./messageCache";
import type { MessageKind, SendMessageArgs } from './useHybridMessages';

// Stable identity so consumers memoizing on it never see a changed reference.
// Returns 0 = "nothing prepended", matching useGlobalMessages' contract.
const NO_OLDER_MESSAGES = async (): Promise<number> => 0;

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

export function useTenantMessages(activeThreadId?: string | null, forceActive?: boolean) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  const { addEvent } = useCalendarEvents();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  // Only use tenant messages for professional roles
  const isTenantContext = forceActive ?? (currentRole && ['patient', 'professional', 'staff', 'admin'].includes(currentRole));

  // React Query for threads - cache-first rendering
  const {
    data: threads = [],
    isLoading: isThreadsLoading,
    isFetching: isThreadsFetching,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ['tenant-threads', user?.id, activeTenantId],
    queryFn: async () => {
      if (!user || !activeTenantId || !isTenantContext) return [];

      // First get thread IDs where user participates
      const { data: myParticipation, error: partErr } = await supabase
        .from('thread_participants')
        .select('thread_id, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (partErr) throw partErr;

      const threadIds = (myParticipation || []).map((p: any) => p.thread_id);
      if (threadIds.length === 0) return [];

      // Get threads by IDs
      const { data: threadRows, error: threadError } = await supabase
        .from('message_threads')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .in('id', threadIds)
        .order('updated_at', { ascending: false });

      if (threadError) throw threadError;

      // Get all participants for these threads
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('thread_participants')
        .select(`
          thread_id,
          user_id,
          role,
          last_read_at,
          profile:profiles(
            user_id,
            full_name,
            display_name,
            avatar_url
          )
        `)
        .in('thread_id', threadIds)
        .eq('is_active', true);

      if (allParticipantsError) {
        console.error('Error fetching thread participants:', allParticipantsError);
      }

      // Deduplicate participants by user_id within each thread
      const deduplicatedParticipants = (allParticipants || []).reduce((acc: any[], participant: any) => {
        const key = `${participant.thread_id}-${participant.user_id}`;
        const existing = acc.find(p => `${p.thread_id}-${p.user_id}` === key);
        if (!existing) {
          acc.push(participant);
        }
        return acc;
      }, []);

      // Get last message and unread count for each thread
      const threadsWithDetails = await Promise.all(
        (threadRows || []).map(async (thread) => {
          // Get last message
          const { data: lastMessage, error: lastMessageError } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', thread.id)
            .eq('tenant_id', activeTenantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // PGRST116 = no rows (thread genuinely has zero messages yet); not an error worth logging.
          if (lastMessageError && lastMessageError.code !== 'PGRST116') {
            console.error('Error fetching last message for thread:', thread.id, lastMessageError);
          }

          // Get participants for this thread
          const participants = deduplicatedParticipants
            .filter((p: any) => p.thread_id === thread.id)
            .map((p: any) => ({
              user_id: p.user_id,
              role: p.role,
              last_read_at: p.last_read_at,
              full_name: p.profile?.full_name,
              display_name: p.profile?.display_name,
              avatar_url: p.profile?.avatar_url,
            }));

          // Get unread count
          const userParticipant = (myParticipation || []).find(
            (p: any) => p.thread_id === thread.id
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
            participants,
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      // Deduplicate threads by ID
      const uniqueThreads = threadsWithDetails.reduce((acc: any[], thread: any) => {
        const existing = acc.find(t => t.id === thread.id);
        if (!existing) {
          acc.push(thread);
        }
        return acc;
      }, []);

      return uniqueThreads;
    },
    enabled: !!user && !!activeTenantId && !!isTenantContext,
    staleTime: 2 * 60 * 1000,
  });

  // React Query for messages - per-thread caching
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    isFetching: isMessagesFetching,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['tenant-messages', activeThreadId, activeTenantId],
    queryFn: async () => {
      if (!user || !activeTenantId || !isTenantContext || !activeThreadId) return [];

      const { data: messagesData = [], error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const senderIds = Array.from(new Set(messagesData.map(m => m.sender_id).filter(Boolean)));
      if (senderIds.length === 0) {
        return messagesData.map(message => ({ ...message, sender: null }));
      }

      const { data: senderProfiles = [], error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, avatar_url')
        .eq('tenant_id', activeTenantId)
        .in('user_id', senderIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(senderProfiles.map(p => [p.user_id, p] as const));

      return messagesData.map(message => ({
        ...message,
        sender: profileMap.get(message.sender_id) || null,
      }));
    },
    enabled: !!user && !!activeTenantId && !!activeThreadId && !!isTenantContext,
    staleTime: 2 * 60 * 1000,
  });

  // Sync badge: dispatch computed unread total for tenant threads
  useEffect(() => {
    if (user && threads.length > 0 && !isThreadsLoading && isTenantContext) {
      const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);
      window.dispatchEvent(new CustomEvent('chat-unread-count-update', { detail: { count: totalUnread } }));
    }
  }, [user, threads, isThreadsLoading, isTenantContext]);

  // Derived loading state for backwards compatibility
  const isLoading = isThreadsLoading || isMessagesLoading;

  // Helper to optimistically update messages in React Query cache
  const updateMessagesOptimistically = useCallback((threadId: string, updater: (prev: TenantMessage[]) => TenantMessage[]) => {
    queryClient.setQueryData(['tenant-messages', threadId, activeTenantId], (prev: TenantMessage[] | undefined) => {
      return updater(prev || []);
    });
  }, [queryClient, activeTenantId]);

  // Helper to optimistically update threads in React Query cache
  const updateThreadsOptimistically = useCallback((updater: (prev: TenantMessageThread[]) => TenantMessageThread[]) => {
    queryClient.setQueryData(['tenant-threads', user?.id, activeTenantId], (prev: TenantMessageThread[] | undefined) => {
      return updater(prev || []);
    });
  }, [queryClient, user?.id, activeTenantId]);

  // Legacy fetchThreads for backwards compatibility - now triggers refetch
  const fetchThreads = useCallback(async () => {
    await refetchThreads();
  }, [refetchThreads]);

  // Legacy fetchMessages for backwards compatibility - now triggers refetch
  const fetchMessages = useCallback(async (threadId?: string, recipientId?: string) => {
    if (threadId === activeThreadId) {
      await refetchMessages();
    }
    // For different thread, the queryKey change will trigger automatic fetch
  }, [activeThreadId, refetchMessages]);


  // Legacy sendMessage for backwards compatibility - will be removed
  const sendMessageLegacy = useCallback(async (
    body: string,
    threadId?: string,
    recipientId?: string,
    messageType = 'text',
    contentData?: any,
    parentMessageId?: string,
    actionButtons?: any[]
  ) => {
    if (!user || !activeTenantId || !isTenantContext) return;

    try {
      setIsSending(true);

      // Get user profile for optimistic update
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

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

      // Add optimistic message immediately to React Query cache
      if (threadId) {
        updateMessagesOptimistically(threadId, prev => [...prev, optimisticMessage]);
      }

      // Update legacy cache for compatibility
      const optimisticCacheKey = threadId || `direct:${recipientId}`;
      messageCache.addMessage(optimisticCacheKey, 'tenant', optimisticMessage, activeTenantId);

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
          parent_message_id: parentMessageId || null,
          sent_at: new Date().toISOString(),
          action_buttons: actionButtons || null,
        })
        .select()
        .single();

      if (error) {
        // Remove optimistic message on error
        if (threadId) {
          updateMessagesOptimistically(threadId, prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
        // Normalize error to standard Error object
        throw new Error(error.message || error.hint || 'Failed to send message');
      }

      // Replace optimistic message with real message
      if (threadId) {
        updateMessagesOptimistically(threadId, prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...data, sender: userProfile } 
              : msg
          )
        );
      }

      // Update cache with real message
      const realCacheKey = threadId || `direct:${recipientId}`;
      messageCache.updateMessage(realCacheKey, 'tenant', optimisticMessage.id, { ...data, sender: userProfile }, activeTenantId);

      // Auto-add calendar event for sender if this is a calendar invite
      if (messageType === 'calendar_invite' || (messageType === 'system' && contentData?.eventType === 'calendar_invite')) {
        try {
          const eventTitle = contentData?.title || (body.includes(':') ? body.split(':')[1]?.trim() : 'Calendar Event');
          const eventDate = contentData?.date;
          const eventTime = contentData?.time || '09:00';
          const eventEndDate = contentData?.endDate || eventDate;
          const eventEndTime = contentData?.endTime || '10:00';
          
          let eventStartTime, eventEndDateTime;
          if (contentData?.start_time) {
            eventStartTime = new Date(contentData.start_time);
          } else if (eventDate) {
            eventStartTime = new Date(`${eventDate} ${eventTime}`);
          } else {
            eventStartTime = new Date();
          }
          
          if (contentData?.end_time) {
            eventEndDateTime = new Date(contentData.end_time);
          } else if (eventEndDate) {
            eventEndDateTime = new Date(`${eventEndDate} ${eventEndTime}`);
          } else {
            eventEndDateTime = new Date(eventStartTime.getTime() + 60 * 60 * 1000); // 1 hour later
          }

          await addEvent({
            user_id: user.id,
            title: eventTitle,
            description: contentData?.description,
            location: contentData?.location,
            start_time: eventStartTime,
            end_time: eventEndDateTime,
            event_type: 'personal',
            status: 'confirmed',
            priority: 'medium',
            is_recurring: false,
            source_type: 'invite',
            source_message_id: data.id,
            metadata: {
              auto_created: true,
              invite_message_type: messageType,
              created_by_client: true
            }
          });
        } catch (calendarError) {
          // Don't break message sending if calendar creation fails
          console.warn('Failed to auto-create calendar event for sender:', calendarError);
        }
      }

      const now = new Date().toISOString();

      // Update thread's updated_at if thread exists
      if (threadId) {
        await supabase
          .from('message_threads')
          .update({ updated_at: now })
          .eq('id', threadId)
          .eq('tenant_id', activeTenantId);

        // Immediately move this thread to the top locally for instant feedback
        updateThreadsOptimistically(prev => {
          const threadToMove = prev.find(t => t.id === threadId);
          if (!threadToMove) return prev;
          
          const updatedThread = {
            ...threadToMove,
            updated_at: now,
            last_message: { ...data, sender: userProfile }
          };
          
          const otherThreads = prev.filter(t => t.id !== threadId);
          return [updatedThread, ...otherThreads];
        });
      }

      // Refresh threads to ensure consistency with database
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
  const sendMessage = useCallback(async (args: SendMessageArgs & { actionButtons?: any[] }) => {
    return sendMessageLegacy(args.content, args.threadId, args.recipientId, args.type || 'text', args.contentData, args.parentMessageId, args.actionButtons);
  }, [sendMessageLegacy]);

  const createThread = useCallback(async (
    participantIds: string[],
    name?: string,
    type = 'direct'
  ) => {
    if (!user || !activeTenantId || !isTenantContext) return;

    try {
      // For direct threads, use the Supabase function to prevent duplicates
      if (type === 'direct' && participantIds.length === 1) {
        const { data: threadId, error: rpcError } = await supabase.rpc(
          'create_tenant_direct_thread',
          { 
            p_recipient_id: participantIds[0],
            p_tenant_id: activeTenantId
          }
        );

        if (rpcError) throw rpcError;

        await fetchThreads();
        
        // Return the thread object
        const { data: thread, error: fetchThreadError } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', threadId)
          .maybeSingle();

        if (fetchThreadError) throw fetchThreadError;

        return thread;
      }

      // For group threads, create normally
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
          .maybeSingle();

        // Only update if new timestamp is later (idempotent)
        if (!currentParticipant?.last_read_at || new Date(now) > new Date(currentParticipant.last_read_at)) {
          const { error } = await supabase
            .from('thread_participants')
            .update({ last_read_at: now })
            .eq('thread_id', threadId)
            .eq('user_id', user.id);

          if (!error) {
            // Optimistically update local state immediately
            updateThreadsOptimistically(prev => prev.map(thread => 
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

            // Force refresh of threads to ensure consistency
            setTimeout(() => {
              fetchThreads();
            }, 500);
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

  // Mark ALL tenant conversations as read (bulk)
  const markAllAsRead = useCallback(async (filter: 'all' | 'direct' | 'groups' = 'all') => {
    if (!user || !activeTenantId || !isTenantContext) return;

    const cached = queryClient.getQueryData<TenantMessageThread[]>(
      ['tenant-threads', user.id, activeTenantId]
    ) || [];
    const threadIds = cached
      .filter((t) => {
        const isGroup = t.type === 'group';
        if (filter === 'direct') return !isGroup;
        if (filter === 'groups') return isGroup;
        return true;
      })
      .map((t) => t.id);

    if (threadIds.length === 0) return;

    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('thread_participants')
        .update({ last_read_at: now })
        .eq('user_id', user.id)
        .in('thread_id', threadIds);

      if (error) throw error;

      updateThreadsOptimistically((prev) =>
        prev.map((thread) =>
          threadIds.includes(thread.id) ? { ...thread, unread_count: 0 } : thread
        )
      );

      await supabase.channel('unread_sync').send({
        type: 'broadcast',
        event: 'unread_change',
        payload: { userId: user.id, context: 'tenant', tenantId: activeTenantId },
      });

      setTimeout(() => {
        fetchThreads();
      }, 500);
    } catch (error) {
      console.error('Error marking all tenant threads as read:', error);
      throw error;
    }
  }, [user, activeTenantId, isTenantContext, queryClient, updateThreadsOptimistically, fetchThreads]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !activeTenantId || !isTenantContext) return;

    const messageChannel = supabase
      .channel('tenant_messages_realtime')
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
          
          // If this is our own message, replace any temp message with the real one
          if (newMessage.sender_id === user.id) {
            updateMessagesOptimistically(newMessage.thread_id, prev => {
              // Find and remove any temp messages for this user that might be stuck
              const tempMessageIndex = prev.findIndex(msg => 
                msg.id.startsWith('temp-') && 
                msg.sender_id === user.id &&
                msg.thread_id === newMessage.thread_id &&
                Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 10000 // Within 10 seconds
              );
              
              if (tempMessageIndex >= 0) {
                // Replace temp message with real message
                const newMessages = [...prev];
                newMessages[tempMessageIndex] = { ...newMessage, sender: prev[tempMessageIndex].sender };
                return newMessages;
              }
              
              // Check if real message already exists to prevent duplicates
              const realMessageExists = prev.some(msg => msg.id === newMessage.id);
              if (!realMessageExists) {
                // Add real message if it doesn't exist
                return [...prev, { ...newMessage, sender: prev.find(m => m.sender_id === user.id)?.sender || null }];
              }
              
              return prev;
            });
            return;
          }
          
          // Fetch sender profile for the new message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, display_name, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .maybeSingle();

          // Add message with sender data to the specific thread's cache
          updateMessagesOptimistically(newMessage.thread_id, prev => [...prev, {
            ...newMessage,
            sender: senderProfile
          }]);
          
          // Immediately move the thread with new message to the top
          updateThreadsOptimistically(prev => {
            const threadToMove = prev.find(t => t.id === newMessage.thread_id);
            if (!threadToMove) return prev;
            
            const updatedThread = {
              ...threadToMove,
              updated_at: newMessage.created_at,
              last_message: { ...newMessage, sender: senderProfile },
              unread_count: threadToMove.unread_count + 1
            };
            
            const otherThreads = prev.filter(t => t.id !== newMessage.thread_id);
            return [updatedThread, ...otherThreads];
          });
          
          // Also refresh threads to update counts and ensure consistency
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Tenant message updated (read receipt):', payload.new);
          const updatedMessage = payload.new as any;
          
          // Only update messages for our tenant
          if (updatedMessage.tenant_id !== activeTenantId) return;
          
          // Update the message status in React Query cache for real-time read receipts
          updateMessagesOptimistically(updatedMessage.thread_id, prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? {
                  ...msg,
                  read_at: updatedMessage.read_at,
                  delivered_at: updatedMessage.delivered_at,
                  sent_at: updatedMessage.sent_at
                }
              : msg
          ));
        }
      )
      .subscribe();

    const threadChannel = supabase
      .channel('tenant_threads_realtime')
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

  // React Query handles initial fetch via enabled flag - no manual useEffect needed
  // No need to clear messages when context changes - React Query handles per-thread caching

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
    isFetching: isThreadsFetching || isMessagesFetching,
    isThreadsLoading,
    isThreadsFetching,
    isMessagesLoading,
    isMessagesFetching,
    isSending,
    typingUsers,
    sendMessage,
    createThread,
    markAsRead,
    markAllAsRead,
    fetchMessages,
    fetchThreads,
    refetchMessages: fetchMessages,
    startTyping,
    stopTyping,
    isTenantContext,
    // Scrollback parity with useGlobalMessages. The tenant messages query
    // above is unbounded — it already returns the whole thread — so there is
    // never an older page to fetch. Present so ConversationView can call the
    // same API in either context without branching.
    loadOlderMessages: NO_OLDER_MESSAGES,
    hasOlderMessages: false,
    isLoadingOlder: false,
  };
}
