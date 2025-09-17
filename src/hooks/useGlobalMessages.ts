import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { supabase } from "@/integrations/supabase/client";

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

  // Only use global messages for community users
  const isGlobalContext = currentRole === 'community';

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

      // Get sender profiles separately
      const senderIds = messagesData?.map(m => m.sender_id) || [];
      const { data: senderProfiles } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      // Combine messages with sender data
      const messagesWithSenders = messagesData?.map(message => ({
        ...message,
        sender: senderProfiles?.find(p => p.user_id === message.sender_id) || null
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
      return;
    }

    try {
      // Get threads where user is a participant
      const { data: threadData, error: threadError } = await supabase
        .from('global_message_threads')
        .select(`
          *,
          participants:global_thread_participants!inner(
            user_id,
            role,
            last_read_at,
            profile:global_community_profiles(
              display_name,
              avatar_url
            )
          )
        `)
        .eq('global_thread_participants.user_id', user.id)
        .eq('global_thread_participants.is_active', true)
        .order('updated_at', { ascending: false });

      if (threadError) throw threadError;

      // Get last message and unread count for each thread
      const threadsWithDetails = await Promise.all(
        (threadData || []).map(async (thread) => {
          // Get last message
          const { data: lastMessage } = await supabase
            .from('global_messages')
            .select('*')
            .eq('thread_id', thread.id)
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
              .from('global_messages')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .gt('created_at', lastReadAt);
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
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      setThreads(threadsWithDetails);
    } catch (error) {
      console.error('Error fetching global threads:', error);
      setThreads([]);
    }
  }, [user, isGlobalContext]);

  const sendMessage = useCallback(async (
    threadId: string,
    body: string,
    messageType = 'text',
    contentData?: any
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      setIsSending(true);

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

      if (error) throw error;

      // Update thread's updated_at
      await supabase
        .from('global_message_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      // Refresh messages and threads
      await Promise.all([
        fetchMessages(threadId),
        fetchThreads(),
      ]);

      return data;
    } catch (error) {
      console.error('Error sending global message:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, isGlobalContext, fetchMessages, fetchThreads]);

  const createThread = useCallback(async (
    participantIds: string[],
    name?: string,
    type = 'direct'
  ) => {
    if (!user || !isGlobalContext) return;

    try {
      // Create thread
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
  }, [user, isGlobalContext, fetchThreads]);

  const markAsRead = useCallback(async (threadId: string) => {
    if (!user || !isGlobalContext) return;

    try {
      await supabase
        .from('global_thread_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.id);

      await fetchThreads();
    } catch (error) {
      console.error('Error marking global thread as read:', error);
    }
  }, [user, isGlobalContext, fetchThreads]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !isGlobalContext) return;

    const messageChannel = supabase
      .channel('global_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_messages',
        },
        () => {
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

  return {
    messages,
    threads,
    isLoading,
    isSending,
    sendMessage,
    createThread,
    markAsRead,
    fetchMessages,
    refetchMessages: fetchMessages,
    isGlobalContext,
  };
}