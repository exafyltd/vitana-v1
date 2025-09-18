import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";
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

export function useGlobalMessages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [threads, setThreads] = useState<GlobalMessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  // Only use global messages for community users
  const isGlobalContext = currentRole === 'community';

  // Helper function to find existing direct thread between two users
  const findExistingDirectThread = useCallback(async (participantIds: string[]) => {
    if (!user || !isGlobalContext || participantIds.length !== 1) return null;
    
    const allParticipants = [user.id, ...participantIds].sort();
    
    try {
      // Find threads where current user participates
      const { data: myThreads } = await supabase
        .from('global_thread_participants')
        .select('thread_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!myThreads || myThreads.length === 0) return null;

      const threadIds = myThreads.map(t => t.thread_id);

      // For each thread, check if it's a direct thread with exactly the same participants
      for (const threadId of threadIds) {
        const { data: threadParticipants } = await supabase
          .from('global_thread_participants')
          .select('user_id')
          .eq('thread_id', threadId)
          .eq('is_active', true);

        if (!threadParticipants) continue;

        const threadUserIds = threadParticipants.map(p => p.user_id).sort();
        
        // Check if participants match exactly
        if (threadUserIds.length === allParticipants.length && 
            threadUserIds.every((id, index) => id === allParticipants[index])) {
          
          // Verify it's a direct thread
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

  const fetchMessages = useCallback(async (threadId?: string) => {
    if (!user || !isGlobalContext) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('global_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (threadId) {
        query = query.eq('thread_id', threadId);
      }

      // Fetch messages with manual join for sender profile
      const { data: messagesData, error } = await query;
      if (error) throw error;

      // Get sender profiles separately with fallback to main profiles
      const senderIds = messagesData?.map(m => m.sender_id) || [];
      
      // First try global community profiles
      const { data: globalProfiles } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      // Fallback to main profiles for missing data
      const { data: mainProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', senderIds);

      // Create profile map with fallback logic
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

      // Combine messages with sender data
      const messagesWithSenders = messagesData?.map(message => ({
        ...message,
        sender: profileMap[message.sender_id] || null
      })) || [];

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching global messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isGlobalContext]);

  const fetchThreads = useCallback(async () => {
    if (!user || !isGlobalContext) {
      setThreads([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 1) Find threads where the current user participates (avoid FK-dependent embeds)
      const { data: myParticipation, error: partErr } = await supabase
        .from('global_thread_participants')
        .select('thread_id, last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (partErr) throw partErr;

      const threadIds = (myParticipation || []).map((p: any) => p.thread_id);
      if (threadIds.length === 0) {
        setThreads([]);
        setIsLoading(false);
        return;
      }

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
      
      // First try global community profiles
      const { data: globalProfiles } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      // Fallback to main profiles for missing data
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

      setThreads(threadsWithDetails);
    } catch (error) {
      console.error('Error fetching global threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isGlobalContext]);

  // Legacy sendMessage for backwards compatibility - will be removed
  const sendMessageLegacy = useCallback(async (
    threadId: string,
    body: string,
    messageType = 'text',
    contentData?: any
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      setIsSending(true);

      // Get user profile for optimistic update
      const { data: userProfile } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

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

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      const { data, error } = await supabase
        .from('global_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
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

      // Update thread's updated_at
      await supabase
        .from('global_message_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      // Only refresh threads (not messages since we have optimistic update)
      await fetchThreads();

      return data;
    } catch (error) {
      console.error('Error sending global message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, isGlobalContext, fetchThreads]);

  // New standardized sendMessage function
  const sendMessage = useCallback(async (args: SendMessageArgs) => {
    return sendMessageLegacy(args.threadId, args.content, args.type || 'text', args.contentData);
  }, [sendMessageLegacy]);

  const createThread = useCallback(async (
    participantIds: string[],
    name?: string,
    type = 'direct'
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      // For direct threads, check if one already exists between the same participants
      if (type === 'direct' && participantIds.length === 1) {
        const existingThreadId = await findExistingDirectThread(participantIds);
        if (existingThreadId) {
          // Return existing thread instead of creating new one
          const { data: existingThread } = await supabase
            .from('global_message_threads')
            .select('*')
            .eq('id', existingThreadId)
            .single();
          
          await fetchThreads(); // Refresh threads list
          return existingThread;
        }
      }

      // Create new thread
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
  }, [user, isGlobalContext, fetchThreads, findExistingDirectThread]);

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
          .single();

        // Only update if new timestamp is later (idempotent)
        if (!currentParticipant?.last_read_at || new Date(now) > new Date(currentParticipant.last_read_at)) {
          const { error } = await supabase
            .from('global_thread_participants')
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
                context: 'global'
              }
            });
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
      .channel('global_messages_changes')
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
          
          // Skip if this is our own message (already handled by optimistic update)
          if (newMessage.sender_id === user.id) return;
          
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
      .channel('global_threads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_message_threads',
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(threadChannel);
    };
  }, [user, isGlobalContext, fetchThreads]);

  // Initial data fetch
  useEffect(() => {
    if (isGlobalContext) {
      fetchThreads();
    } else {
      setThreads([]);
      setMessages([]);
      setIsLoading(false);
    }
  }, [isGlobalContext, fetchThreads]);

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