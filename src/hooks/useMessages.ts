import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyError } from '@/lib/i18n-toast';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string | null;
  thread_id?: string | null;
  tenant_id: string;
  body: string;
  message_type: string;
  content_data?: any | null;
  parent_message_id?: string | null;
  workflow_type?: string | null;
  action_buttons?: any | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name?: string | null;
    avatar_url?: string | null;
    display_name?: string | null;
  } | null;
}

export interface MessageThread {
  id: string;
  name?: string | null;
  type: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata?: any | null;
  participants?: ThreadParticipant[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface ThreadParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at?: string | null;
  is_active: boolean;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
    display_name?: string | null;
  } | null;
}

export const useMessages = (threadId?: string, enableAutoFetch: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Fetch messages for a specific thread or all direct messages
  const fetchMessages = useCallback(async () => {
    if (!enableAutoFetch) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (threadId) {
        query = query.eq('thread_id', threadId);
      } else {
        // For direct messages (no thread)
        query = query.is('thread_id', null);
      }

      const { data: messagesData, error } = await query;
      if (error) throw error;

      // Get unique sender IDs
      const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
      
      // Fetch sender profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, display_name')
        .in('user_id', senderIds);

      // Create profile lookup map
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Transform messages with sender data
      const transformedMessages = (messagesData || []).map(message => ({
        ...message,
        sender: profilesMap.get(message.sender_id) || null
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't show toast error for automatic fetching to prevent global errors
      if (enableAutoFetch) {
        console.warn('Message fetching disabled due to missing context or permissions');
      }
    } finally {
      setLoading(false);
    }
  }, [threadId, enableAutoFetch, toast]);

  // Fetch user's message threads
  const fetchThreads = useCallback(async () => {
    if (!enableAutoFetch) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // First get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: threadsData, error: threadsError } = await supabase
        .from('message_threads')
        .select(`
          *,
          participants:thread_participants (
            *,
            profiles (
              full_name,
              avatar_url,
              display_name
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (threadsError) throw threadsError;

      // Get last message and unread count for each thread
      const enrichedThreads = await Promise.all(
        (threadsData || []).map(async (thread) => {
          // Get last message
          const { data: lastMessage, error: lastMessageError } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // maybeSingle() resolves zero rows as {data: null, error: null}
          // (unlike .single()'s PGRST116) — no "no rows" case to exclude,
          // every non-null error here is a genuine failure.
          if (lastMessageError) {
            console.error('Error fetching last message for thread:', thread.id, lastMessageError);
          }

          // Get unread count (messages after user's last_read_at)
          const userParticipant = thread.participants?.find(
            (p: any) => p.user_id === user.id
          );
          
          const lastReadAt = userParticipant?.last_read_at || '1970-01-01';
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('thread_id', thread.id)
            .gt('created_at', lastReadAt);

          return {
            ...thread,
            participants: thread.participants?.map((p: any) => ({
              ...p,
              profile: p.profiles
            })) || [],
            last_message: lastMessage,
            unread_count: unreadCount || 0
          };
        })
      );

      setThreads(enrichedThreads);
    } catch (error) {
      console.error('Error fetching threads:', error);
      // Don't show toast error for automatic fetching to prevent global errors
      if (enableAutoFetch) {
        console.warn('Thread fetching disabled due to missing context or permissions');
      }
    } finally {
      setLoading(false);
    }
  }, [enableAutoFetch, toast]);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    recipientId?: string,
    messageType: string = 'text',
    contentData?: any,
    workflowType?: string,
    actionButtons?: any[]
  ) => {
    try {
      setSending(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const messageData = {
        body: content,
        sender_id: user.user.id,
        recipient_id: recipientId || null,
        thread_id: threadId || null,
        tenant_id: user.user.app_metadata?.active_tenant_id || 'default',
        message_type: messageType,
        content_data: contentData || null,
        workflow_type: workflowType || null,
        action_buttons: actionButtons || null
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select('*')
        .single();

      if (error) throw error;

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, display_name')
        .eq('user_id', user.user.id)
        .single();

      // Transform the response to match our interface
      const transformedMessage = {
        ...data,
        sender: senderProfile || null
      };

      // Update thread's updated_at if this is a thread message
      if (threadId) {
        await supabase
          .from('message_threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', threadId);
      }

      return transformedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedSendMessage');
      throw error;
    } finally {
      setSending(false);
    }
  }, [threadId, toast]);

  // Create a new thread
  const createThread = useCallback(async (
    name?: string,
    type: string = 'direct',
    participantIds: string[] = []
  ): Promise<MessageThread | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('message_threads')
        .insert([{
          name,
          type,
          tenant_id: user.user.app_metadata?.active_tenant_id || 'default',
          created_by: user.user.id
        }])
        .select()
        .single();

      if (threadError) throw threadError;

      // Add creator as admin participant
      const participants = [
        {
          thread_id: thread.id,
          user_id: user.user.id,
          role: 'admin'
        },
        // Add other participants as members
        ...participantIds.map(id => ({
          thread_id: thread.id,
          user_id: id,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('thread_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      await fetchThreads(); // Refresh threads list
      return thread;
    } catch (error) {
      console.error('Error creating thread:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedCreateConversation');
      return null;
    }
  }, [toast, fetchThreads]);

  // Mark messages as read
  const markAsRead = useCallback(async (threadId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      await supabase
        .from('thread_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', user.user.id);

      await fetchThreads(); // Refresh to update unread counts
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [fetchThreads]);

  // Fetch data on mount and when threadId changes - only if auto-fetch is enabled
  useEffect(() => {
    if (enableAutoFetch) {
      fetchMessages();
      fetchThreads();
    }
  }, [fetchMessages, fetchThreads, threadId, enableAutoFetch]);

  // Subscribe to real-time message updates - only if auto-fetch is enabled
  useEffect(() => {
    if (!enableAutoFetch) {
      return;
    }
    
    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (!threadId || newMessage.thread_id === threadId) {
            setMessages(prev => [...prev, newMessage]);
          }
          fetchThreads(); // Refresh threads to update last message
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    // Subscribe to thread changes
    const threadSubscription = supabase
      .channel('threads-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_threads'
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(threadSubscription);
    };
  }, [threadId, fetchMessages, fetchThreads, enableAutoFetch]);

  return {
    messages,
    threads,
    loading,
    sending,
    sendMessage,
    createThread,
    markAsRead,
    refetch: fetchMessages
  };
};