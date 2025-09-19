import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export interface OptimizedThread {
  id: string;
  name?: string;
  type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: any[];
  last_message?: any;
  unread_count: number;
  context: 'global' | 'tenant';
  tenant_id?: string;
}

interface UseOptimizedThreadsProps {
  context: 'global' | 'tenant';
  tenantId?: string;
}

/**
 * Optimized thread management hook that minimizes database queries
 * and provides smart updates for better synchronization
 */
export function useOptimizedThreads({ context, tenantId }: UseOptimizedThreadsProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<OptimizedThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);
  
  // Debounced fetch with minimum interval to prevent excessive calls
  const debouncedFetchThreads = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent fetching more than once every 500ms
      if (now - lastFetchRef.current > 500) {
        lastFetchRef.current = now;
        fetchThreads();
      }
    }, 100);
  }, []);

  const fetchThreads = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      if (context === 'global') {
        await fetchGlobalThreads();
      } else if (context === 'tenant' && tenantId) {
        await fetchTenantThreads();
      }
    } catch (error) {
      console.error('Error fetching optimized threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, context, tenantId]);

  const fetchGlobalThreads = async () => {
    // Get my thread participations
    const { data: myParticipation } = await supabase
      .from('global_thread_participants')
      .select('thread_id, last_read_at')
      .eq('user_id', user!.id)
      .eq('is_active', true);

    if (!myParticipation?.length) {
      setThreads([]);
      return;
    }

    const threadIds = myParticipation.map(p => p.thread_id);

    // Get threads with last messages in a single optimized query
    const { data: threadsData } = await supabase
      .from('global_message_threads')
      .select(`
        *,
        last_message:global_messages(*)
      `)
      .in('id', threadIds)
      .order('updated_at', { ascending: false });

    // Get all participants efficiently
    const { data: participants } = await supabase
      .from('global_thread_participants')  
      .select(`
        thread_id,
        user_id,
        role,
        last_read_at,
        profile:global_community_profiles(display_name, avatar_url)
      `)
      .in('thread_id', threadIds)
      .eq('is_active', true);

    // Calculate unread counts efficiently
    const unreadCounts = await Promise.all(
      threadIds.map(async (threadId) => {
        const myData = myParticipation.find(p => p.thread_id === threadId);
        const lastReadAt = myData?.last_read_at;
        
        let count = 0;
        if (lastReadAt) {
          const { count: unreadCount } = await supabase
            .from('global_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId)
            .gt('created_at', lastReadAt);
          count = unreadCount || 0;
        } else {
          const { count: totalCount } = await supabase
            .from('global_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId);
          count = totalCount || 0;
        }
        
        return { threadId, count };
      })
    );

    // Assemble final threads
    const processedThreads = threadsData?.map(thread => {
      const threadParticipants = participants?.filter(p => p.thread_id === thread.id) || [];
      const unreadData = unreadCounts.find(u => u.threadId === thread.id);
      
      return {
        ...thread,
        participants: threadParticipants,
        unread_count: unreadData?.count || 0,
        context: 'global' as const,
      };
    }) || [];

    setThreads(processedThreads);
  };

  const fetchTenantThreads = async () => {
    if (!tenantId) return;

    // Get my thread participations
    const { data: myParticipation } = await supabase
      .from('thread_participants')
      .select('thread_id, last_read_at')
      .eq('user_id', user!.id)
      .eq('is_active', true);

    if (!myParticipation?.length) {
      setThreads([]);
      return;
    }

    const threadIds = myParticipation.map(p => p.thread_id);

    // Get threads efficiently
    const { data: threadsData } = await supabase
      .from('message_threads')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('id', threadIds)
      .order('updated_at', { ascending: false });

    // Get last messages efficiently
    const lastMessages = await Promise.all(
      threadIds.map(async (threadId) => {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { threadId, message: data };
      })
    );

    // Get participants
    const { data: participants } = await supabase
      .from('thread_participants')
      .select(`
        thread_id,
        user_id,
        role,
        last_read_at,
        profile:profiles(display_name, avatar_url, full_name)
      `)
      .in('thread_id', threadIds)
      .eq('is_active', true);

    // Calculate unread counts
    const unreadCounts = await Promise.all(
      threadIds.map(async (threadId) => {
        const myData = myParticipation.find(p => p.thread_id === threadId);
        const lastReadAt = myData?.last_read_at;
        
        let count = 0;
        if (lastReadAt) {
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId)
            .eq('tenant_id', tenantId)
            .gt('created_at', lastReadAt);
          count = unreadCount || 0;
        } else {
          const { count: totalCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId)
            .eq('tenant_id', tenantId);
          count = totalCount || 0;
        }
        
        return { threadId, count };
      })
    );

    // Assemble final threads
    const processedThreads = threadsData?.map(thread => {
      const threadParticipants = participants?.filter(p => p.thread_id === thread.id) || [];
      const lastMessageData = lastMessages.find(m => m.threadId === thread.id);
      const unreadData = unreadCounts.find(u => u.threadId === thread.id);
      
      return {
        ...thread,
        participants: threadParticipants,
        last_message: lastMessageData?.message || null,
        unread_count: unreadData?.count || 0,
        context: 'tenant' as const,
        tenant_id: tenantId,
      };
    }) || [];

    setThreads(processedThreads);
  };

  // Optimistically update a thread with new message
  const updateThreadWithMessage = useCallback((threadId: string, message: any) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          last_message: message,
          updated_at: message.created_at || new Date().toISOString(),
          unread_count: thread.unread_count + 1 // Will be corrected by real-time update
        };
      }
      return thread;
    }));
  }, []);

  // Update specific thread without full refetch
  const updateThread = useCallback((threadId: string, updates: Partial<OptimizedThread>) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, ...updates }
        : thread
    ));
  }, []);

  // Mark thread as read with optimistic update
  const markThreadAsRead = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread =>
      thread.id === threadId
        ? { ...thread, unread_count: 0 }
        : thread
    ));
  }, []);

  // Set up real-time subscriptions with smart updates
  useEffect(() => {
    if (!user) return;

    const messageTable = context === 'global' ? 'global_messages' : 'messages';
    const threadTable = context === 'global' ? 'global_message_threads' : 'message_threads';
    
    const messageChannel = supabase
      .channel(`optimized_${context}_messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: messageTable,
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Skip our own messages (handled by optimistic updates)
          if (newMessage.sender_id === user.id) return;
          
          // Update thread with new message
          if (newMessage.thread_id) {
            updateThreadWithMessage(newMessage.thread_id, newMessage);
          }
          
          // Debounced fetch to get accurate data
          debouncedFetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: threadTable,
        },
        (payload) => {
          const updatedThread = payload.new as any;
          updateThread(updatedThread.id, {
            updated_at: updatedThread.updated_at
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user, context, tenantId, updateThreadWithMessage, updateThread, debouncedFetchThreads]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [fetchThreads]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    threads,
    isLoading,
    fetchThreads: debouncedFetchThreads,
    updateThreadWithMessage,
    updateThread,
    markThreadAsRead,
  };
}