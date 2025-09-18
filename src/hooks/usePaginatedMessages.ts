import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageCursor {
  created_at: string;
  id: string;
}

export interface MessageData {
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
    full_name?: string;
    avatar_url?: string;
  } | null;
}

export interface PaginatedMessagesState {
  messages: MessageData[];
  hasOlder: boolean;
  isLoadingOlder: boolean;
  cursor?: MessageCursor;
}

export interface PaginatedMessagesConfig {
  pageSize?: number;
  virtualizationThreshold?: number;
  paginationThreshold?: number;
}

const DEFAULT_CONFIG: Required<PaginatedMessagesConfig> = {
  pageSize: 50,
  virtualizationThreshold: 200,
  paginationThreshold: 50,
};

/**
 * Hook for paginated message fetching with cursor-based pagination
 * Optimized for long threads with viewport anchoring
 */
export function usePaginatedMessages(config: PaginatedMessagesConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<PaginatedMessagesState>({
    messages: [],
    hasOlder: false,
    isLoadingOlder: false,
  });

  // Track first message element for scroll anchoring
  const firstMessageRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchSenderProfiles = useCallback(async (senderIds: string[], context: 'global' | 'tenant'): Promise<Record<string, any>> => {
    if (senderIds.length === 0) return {};

    const profileMap: Record<string, any> = {};

    if (context === 'global') {
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

      senderIds.forEach(userId => {
        const globalProfile = globalProfiles?.find(p => p.user_id === userId);
        const mainProfile = mainProfiles?.find(p => p.user_id === userId);
        
        profileMap[userId] = {
          user_id: userId,
          display_name: globalProfile?.display_name || mainProfile?.display_name || mainProfile?.full_name || 'Unknown User',
          avatar_url: globalProfile?.avatar_url || mainProfile?.avatar_url || null
        };
      });
    } else {
      // Tenant context - use main profiles
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, display_name, avatar_url')
        .in('user_id', senderIds);

      senderIds.forEach(userId => {
        const profile = senderProfiles?.find(p => p.user_id === userId);
        profileMap[userId] = profile || { user_id: userId, display_name: 'Unknown User', avatar_url: null };
      });
    }

    return profileMap;
  }, []);

  const fetchInitialMessages = useCallback(async (
    threadId: string,
    context: 'global' | 'tenant',
    tenantId?: string
  ) => {
    try {
      const tableName = context === 'global' ? 'global_messages' : 'messages';
      
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(finalConfig.pageSize);

      if (context === 'tenant' && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: messagesData, error } = await query;
      if (error) throw error;

      // Reverse to show oldest first in UI
      const reversedMessages = (messagesData || []).reverse();
      
      // Get sender profiles
      const senderIds = reversedMessages.map(m => m.sender_id);
      const profileMap = await fetchSenderProfiles(senderIds, context);

      // Combine messages with sender data
      const messagesWithSenders = reversedMessages.map(message => ({
        ...message,
        sender: profileMap[message.sender_id] || null
      }));

      // Set cursor to oldest message for pagination
      const cursor = messagesData && messagesData.length > 0 
        ? {
            created_at: messagesData[messagesData.length - 1].created_at,
            id: messagesData[messagesData.length - 1].id
          }
        : undefined;

      setState((prev: PaginatedMessagesState) => ({
        ...prev,
        messages: messagesWithSenders,
        hasOlder: messagesData ? messagesData.length === finalConfig.pageSize : false,
        isLoadingOlder: false,
        cursor,
      }));

      return messagesWithSenders;
    } catch (error) {
      console.error('Error fetching initial messages:', error);
      setState(prev => ({ ...prev, messages: [], hasOlder: false, isLoadingOlder: false }));
      return [];
    }
  }, [finalConfig.pageSize, fetchSenderProfiles]);

  const loadOlderMessages = useCallback(async (
    threadId: string,
    context: 'global' | 'tenant',
    tenantId?: string
  ) => {
    if (!state.hasOlder || state.isLoadingOlder || !state.cursor) return;

    try {
      setState(prev => ({ ...prev, isLoadingOlder: true }));

      // Store scroll position before adding new messages
      const scrollContainer = scrollContainerRef.current;
      const firstMessage = firstMessageRef.current;
      const oldScrollHeight = scrollContainer?.scrollHeight || 0;
      const oldScrollTop = scrollContainer?.scrollTop || 0;
      const firstMessageOffsetTop = firstMessage?.offsetTop || 0;

      const tableName = context === 'global' ? 'global_messages' : 'messages';
      
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('thread_id', threadId)
        .lt('created_at', state.cursor.created_at)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(finalConfig.pageSize);

      if (context === 'tenant' && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: olderMessagesData, error } = await query;
      if (error) throw error;

      if (!olderMessagesData || olderMessagesData.length === 0) {
        setState(prev => ({ ...prev, hasOlder: false, isLoadingOlder: false }));
        return;
      }

      // Reverse to show oldest first
      const reversedOlderMessages = olderMessagesData.reverse();
      
      // Get sender profiles
      const senderIds = reversedOlderMessages.map(m => m.sender_id);
      const profileMap = await fetchSenderProfiles(senderIds, context);

      // Combine messages with sender data
      const olderMessagesWithSenders = reversedOlderMessages.map(message => ({
        ...message,
        sender: profileMap[message.sender_id] || null
      }));

      // Update cursor to the oldest message
      const newCursor = {
        created_at: olderMessagesData[olderMessagesData.length - 1].created_at,
        id: olderMessagesData[olderMessagesData.length - 1].id
      };

      setState(prev => ({
        messages: [...olderMessagesWithSenders, ...prev.messages],
        hasOlder: olderMessagesData.length === finalConfig.pageSize,
        isLoadingOlder: false,
        cursor: newCursor,
      }));

      // Restore scroll position to prevent viewport jump
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const heightDifference = newScrollHeight - oldScrollHeight;
          scrollContainer.scrollTop = oldScrollTop + heightDifference;
        }
      });

    } catch (error) {
      console.error('Error loading older messages:', error);
      setState(prev => ({ ...prev, isLoadingOlder: false }));
    }
  }, [state.hasOlder, state.isLoadingOlder, state.cursor, finalConfig.pageSize, fetchSenderProfiles]);

  const addNewMessage = useCallback((message: MessageData) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<MessageData>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId)
    }));
  }, []);

  const shouldUsePagination = state.messages.length > finalConfig.paginationThreshold;
  const shouldUseVirtualization = state.messages.length > finalConfig.virtualizationThreshold;

  return {
    messages: state.messages,
    hasOlder: state.hasOlder,
    isLoadingOlder: state.isLoadingOlder,
    cursor: state.cursor,
    fetchInitialMessages,
    loadOlderMessages,
    addNewMessage,
    updateMessage,
    removeMessage,
    shouldUsePagination,
    shouldUseVirtualization,
    firstMessageRef,
    scrollContainerRef,
    config: finalConfig,
  } as const;
}
