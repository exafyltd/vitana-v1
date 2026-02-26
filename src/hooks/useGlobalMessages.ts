import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarEvents } from "./useCalendarEvents";
import { messageCache } from "./messageCache";
import type { MessageKind, SendMessageArgs } from './useHybridMessages';

export interface GlobalMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data?: any;
  created_at: string;
  updated_at: string;
  sender?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

export interface GlobalMessageThread {
  id: string;
  name?: string;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: {
    user_id: string;
    display_name?: string;
    avatar_url?: string;
    role: string;
    last_read_at?: string;
  }[];
  last_message?: GlobalMessage;
  unread_count: number;
}

export function useGlobalMessages(activeThreadId?: string | null, forceActive?: boolean) {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { addEvent } = useCalendarEvents();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  // Use global messages when forced active by useHybridMessages, or for community users
  const isGlobalContext = forceActive ?? (currentRole === 'community');

  // React Query for threads - cache-first rendering
  const {
    data: threads = [],
    isLoading: isThreadsLoading,
    isFetching: isThreadsFetching,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ['global-threads', user?.id],
    queryFn: async () => {
      if (!user || !isGlobalContext) return [];

      // 1) Find threads where the current user participates
      const { data: myParticipation, error: partErr } = await supabase
        .from('global_thread_participants')
        .select('thread_id, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (partErr) throw partErr;

      const threadIds = (myParticipation || []).map((p: any) => p.thread_id);
      if (threadIds.length === 0) return [];

      // 2) Fetch threads by ids
      const { data: threadRows, error: threadErr } = await supabase
        .from('global_message_threads')
        .select('*')
        .in('id', threadIds)
        .order('updated_at', { ascending: false });

      if (threadErr) throw threadErr;

      // 3) Fetch all participants for these threads
      const { data: allParticipants } = await supabase
        .from('global_thread_participants')
        .select('thread_id, user_id, role, last_read_at')
        .in('thread_id', threadIds)
        .eq('is_active', true);

      // 4) Fetch profiles for participant users with fallback
      const userIds = Array.from(new Set((allParticipants || []).map((p: any) => p.user_id)));
      
      const { data: globalProfiles } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const { data: mainProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      // Create profile map with fallback logic
      const profileMap: Record<string, any> = {};
      userIds.forEach(userId => {
        const globalProfile = globalProfiles?.find(p => p.user_id === userId);
        const mainProfile = mainProfiles?.find(p => p.user_id === userId);
        
        profileMap[userId] = {
          user_id: userId,
          display_name: globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User',
          avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null
        };
      });

      // 5) For each thread get last message and unread count
      const threadsWithDetails = await Promise.all(
        (threadRows || []).map(async (thread: any) => {
          const participants = (allParticipants || [])
            .filter((p: any) => p.thread_id === thread.id)
            .map((p: any) => ({
              user_id: p.user_id,
              role: p.role,
              last_read_at: p.last_read_at,
              display_name: profileMap[p.user_id]?.display_name || 'Unknown User',
              avatar_url: profileMap[p.user_id]?.avatar_url || null,
            }));

          // Last message
          const { data: lastMessage } = await supabase
            .from('global_messages')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Unread count based on my last_read_at
          const me = (myParticipation || []).find((p: any) => p.thread_id === thread.id);
          let unreadCount = 0;
          if (me?.last_read_at) {
            const { count } = await supabase
              .from('global_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .gt('created_at', me.last_read_at as string);
            unreadCount = count || 0;
          } else {
            const { count } = await supabase
              .from('global_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id);
            unreadCount = count || 0;
          }

          return {
            ...thread,
            participants,
            last_message: lastMessage || null,
            unread_count: unreadCount,
          } as GlobalMessageThread;
        })
      );

      return threadsWithDetails;
    },
    enabled: !!user && isGlobalContext,
    staleTime: 2 * 60 * 1000,
  });

  // React Query for messages - per-thread caching
  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    isFetching: isMessagesFetching,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['global-messages', activeThreadId],
    queryFn: async () => {
      if (!user || !isGlobalContext || !activeThreadId) return [];

      const { data: messagesData = [], error: messagesError } = await supabase
        .from('global_messages')
        .select('*')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const senderIds = Array.from(new Set(messagesData.map(m => m.sender_id).filter(Boolean)));
      if (senderIds.length === 0) {
        return messagesData.map(message => ({ ...message, sender: null }));
      }

      const [globalProfilesResponse, mainProfilesResponse] = await Promise.all([
        supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', senderIds),
        supabase
          .from('profiles')
          .select('user_id, display_name, full_name, avatar_url')
          .in('user_id', senderIds),
      ]);

      if (globalProfilesResponse.error) throw globalProfilesResponse.error;
      if (mainProfilesResponse.error) throw mainProfilesResponse.error;

      const globalProfiles = globalProfilesResponse.data || [];
      const mainProfiles = mainProfilesResponse.data || [];

      const profileMap: Record<string, any> = {};
      senderIds.forEach(userId => {
        const globalProfile = globalProfiles.find(p => p.user_id === userId);
        const mainProfile = mainProfiles.find(p => p.user_id === userId);

        profileMap[userId] = {
          user_id: userId,
          display_name:
            globalProfile?.display_name ||
            mainProfile?.display_name ||
            mainProfile?.full_name ||
            'Unknown User',
          avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null,
        };
      });

      return messagesData.map(message => ({
        ...message,
        sender: profileMap[message.sender_id] || null,
      }));
    },
    enabled: !!user && !!activeThreadId && isGlobalContext,
    staleTime: 2 * 60 * 1000,
  });

  // Derived loading state for backwards compatibility
  const isLoading = isThreadsLoading || isMessagesLoading;

  // Helper to optimistically update messages in React Query cache
  const updateMessagesOptimistically = useCallback((threadId: string, updater: (prev: GlobalMessage[]) => GlobalMessage[]) => {
    queryClient.setQueryData(['global-messages', threadId], (prev: GlobalMessage[] | undefined) => {
      return updater(prev || []);
    });
  }, [queryClient]);

  // Helper function to find existing direct thread between two users
  const findExistingDirectThread = useCallback(async (participantIds: string[]) => {
    if (!user || !isGlobalContext || participantIds.length !== 1) return null;
    
    const allParticipants = [user.id, ...participantIds].sort();
    
    try {
      const { data: myThreads } = await supabase
        .from('global_thread_participants')
        .select('thread_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!myThreads || myThreads.length === 0) return null;

      const threadIds = myThreads.map(t => t.thread_id);

      for (const threadId of threadIds) {
        const { data: threadParticipants } = await supabase
          .from('global_thread_participants')
          .select('user_id')
          .eq('thread_id', threadId)
          .eq('is_active', true);

        if (!threadParticipants) continue;

        const threadUserIds = threadParticipants.map(p => p.user_id).sort();
        
        if (threadUserIds.length === allParticipants.length && 
            threadUserIds.every((id, index) => id === allParticipants[index])) {
          
          const { data: thread } = await supabase
            .from('global_message_threads')
            .select('id, type')
            .eq('id', threadId)
            .eq('type', 'direct')
            .single();

          if (thread) return thread.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing direct thread:', error);
      return null;
    }
  }, [user, isGlobalContext]);

  // Helper to optimistically update threads in React Query cache
  const updateThreadsOptimistically = useCallback((updater: (prev: GlobalMessageThread[]) => GlobalMessageThread[]) => {
    queryClient.setQueryData(['global-threads', user?.id], (prev: GlobalMessageThread[] | undefined) => {
      return updater(prev || []);
    });
  }, [queryClient, user?.id]);

  // Legacy fetchThreads for backwards compatibility - now triggers refetch
  const fetchThreads = useCallback(async () => {
    await refetchThreads();
  }, [refetchThreads]);

  // Legacy fetchMessages for backwards compatibility - now triggers refetch
  const fetchMessages = useCallback(async (threadId?: string) => {
    if (threadId === activeThreadId) {
      await refetchMessages();
    }
    // For different thread, the queryKey change will trigger automatic fetch
  }, [activeThreadId, refetchMessages]);


  // Legacy sendMessage for backwards compatibility - will be removed
  const sendMessageLegacy = useCallback(async (
    threadId: string,
    body: string,
    messageType = 'text',
    contentData?: any,
    parentMessageId?: string,
    actionButtons?: any[]
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      setIsSending(true);

      // Get user profile for optimistic update
      const { data: userProfile } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      // Create optimistic message
      const optimisticMessage: GlobalMessage = {
        id: `temp-${Date.now()}`,
        thread_id: threadId,
        sender_id: user.id,
        body,
        message_type: messageType,
        content_data: contentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: userProfile || null
      };

      // Add optimistic message immediately to React Query cache
      updateMessagesOptimistically(threadId, prev => [...prev, optimisticMessage]);

      // Update legacy cache for compatibility
      messageCache.addMessage(threadId || 'general', 'global', optimisticMessage);

      const { data, error } = await supabase
        .from('global_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
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
        updateMessagesOptimistically(threadId, prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        // Normalize error to standard Error object
        throw new Error(error.message || error.hint || 'Failed to send message');
      }

      // Update optimistic message with real message
      updateMessagesOptimistically(threadId, prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...data, sender: userProfile } 
            : msg
        )
      );

      // Update cache with real message
      messageCache.updateMessage(threadId || 'general', 'global', optimisticMessage.id, { ...data, sender: userProfile });
      
      // Log message send activity
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logMessageSend } = useCommunityLogger();
        logMessageSend(threadId, messageType, 'global');
      });

      // Note: Sender calendar event creation is handled by CreateEventPopup.tsx
      // to avoid race conditions and ensure proper data structure

      const now = new Date().toISOString();

      // Update thread's updated_at
      await supabase
        .from('global_message_threads')
        .update({ updated_at: now })
        .eq('id', threadId);

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

      // Real-time updates will handle thread consistency - no aggressive refetch needed

      return data;
    } catch (error) {
      console.error('Error sending global message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, isGlobalContext, fetchThreads]);

  // New standardized sendMessage function
  const sendMessage = useCallback(async (args: SendMessageArgs & { actionButtons?: any[] }) => {
    return sendMessageLegacy(args.threadId, args.content, args.type || 'text', args.contentData, args.parentMessageId, args.actionButtons);
  }, [sendMessageLegacy]);

  const createThread = useCallback(async (
    participantIds: string[],
    name?: string,
    type = 'direct'
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      // For direct threads, use the better function to prevent duplicates  
      if (type === 'direct' && participantIds.length === 1) {
        const { data, error: rpcError } = await supabase.rpc(
          'create_or_get_global_dm' as any,
          { p_other_user: participantIds[0] }
        );

        if (rpcError) throw rpcError;

        const threadId = data?.[0]?.thread_id;
        if (!threadId) throw new Error('Failed to create or get thread');

        await fetchThreads();
        
        // Return the thread object
        const { data: thread } = await supabase
          .from('global_message_threads')
          .select('*')
          .eq('id', threadId)
          .maybeSingle();
        
        return thread;
      }

      // For group threads, create normally
      const { data: thread, error: threadError } = await supabase
        .from('global_message_threads')
        .insert({
          created_by: user.id,
          name,
          type,
        })
        .select()
        .single();

      if (threadError) throw threadError;
      
      // Log conversation start or group chat creation
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logConversationStart, logGroupChatCreate } = useCommunityLogger();
        if (type === 'direct') {
          logConversationStart(participantIds[0], 'global');
        } else {
          logGroupChatCreate(thread.id, participantIds.length + 1);
        }
      });

      // Add participants
      const participantsToAdd = [user.id, ...participantIds.filter(id => id !== user.id)];
      const { error: participantsError } = await supabase
        .from('global_thread_participants')
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
      console.error('Error creating global thread:', error);
      throw error;
    }
  }, [user, isGlobalContext, fetchThreads]);

  // Debounced mark as read with smart timestamp checking
  const markAsReadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const markAsRead = useCallback(async (threadId: string) => {
    if (!user || !isGlobalContext) return;

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
          .from('global_thread_participants')
          .select('last_read_at')
          .eq('thread_id', threadId)
          .eq('user_id', user.id)
          .maybeSingle();

        // Only update if new timestamp is later (idempotent)
        if (!currentParticipant?.last_read_at || new Date(now) > new Date(currentParticipant.last_read_at)) {
          const { error } = await supabase
            .from('global_thread_participants')
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
                context: 'global'
              }
            });

            // Force refresh of threads to ensure consistency
            setTimeout(() => {
              fetchThreads();
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error marking global thread as read:', error);
      } finally {
        markAsReadTimeouts.current.delete(threadId);
      }
    }, 300); // 300ms debounce

    markAsReadTimeouts.current.set(threadId, timeout);
  }, [user, isGlobalContext]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const messageChannel = supabase
      .channel('global_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_messages',
        },
        async (payload) => {
          console.log('New global message received:', payload.new);
          const newMessage = payload.new as any;
          
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
          
          // Fetch sender profile for the new message with fallback
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

          const senderProfile = {
            user_id: newMessage.sender_id,
            display_name: globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User',
            avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null
          };

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
          
          // Also refresh threads to update last message and ensure consistency
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_messages',
        },
        (payload) => {
          console.log('Global message updated (read receipt):', payload.new);
          const updatedMessage = payload.new as any;
          
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
      .channel('global_threads_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_message_threads',
        },
        (payload) => {
          console.log('Global thread change:', payload);
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(threadChannel);
    };
  }, [user, isGlobalContext, fetchThreads]);

  // React Query handles initial fetch via enabled flag - no manual useEffect needed
  // No need to clear messages when context changes - React Query handles per-thread caching

  const startTyping = useCallback(async (threadId?: string) => {
    if (!user || !isGlobalContext || !threadId) return;
    
    try {
      // Use realtime channel for typing instead of database
      const channel = supabase.channel(`global_typing_${threadId}`);
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
  }, [user, isGlobalContext]);

  const stopTyping = useCallback(async (threadId?: string) => {
    if (!user || !isGlobalContext || !threadId) return;
    
    try {
      // Use realtime channel for typing instead of database
      const channel = supabase.channel(`global_typing_${threadId}`);
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
  }, [user, isGlobalContext]);

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
    fetchMessages,
    fetchThreads,
    refetchMessages: fetchMessages,
    startTyping,
    stopTyping,
    isGlobalContext,
  };
}