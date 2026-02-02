import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageCursor {
  created_at: string;
  id: string;
}

export type MessageData = {
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
};

export type PaginatedMessagesConfig = {
  pageSize?: number;
  virtualizationThreshold?: number;
  paginationThreshold?: number;
};

export function usePaginatedMessages(config: PaginatedMessagesConfig = {}) {
  const pageSize = config.pageSize || 50;
  const paginationThreshold = config.paginationThreshold || 50;
  const virtualizationThreshold = config.virtualizationThreshold || 200;

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [hasOlder, setHasOlder] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [cursor, setCursor] = useState<MessageCursor | undefined>(undefined);

  const firstMessageRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchInitialMessages = useCallback(async (
    threadId: string,
    context: 'global' | 'tenant',
    tenantId?: string
  ) => {
    try {
      const tableName = context === 'global' ? 'global_messages' : 'messages';
      
      // Select specific columns instead of * for better performance
      const selectColumns = 'id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at';
      
      // Use type assertion to avoid TypeScript recursion
      let queryBuilder = supabase
        .from(tableName)
        .select(selectColumns)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(pageSize) as any;

      if (context === 'tenant' && tenantId) {
        queryBuilder = queryBuilder.eq('tenant_id', tenantId);
      }

      const result = await queryBuilder;
      if (result.error) throw result.error;

      const messagesData: any[] = result.data || [];
      const reversedMessages = [...messagesData].reverse();
      
      if (messagesData.length > 0) {
        const lastMessage = messagesData[messagesData.length - 1];
        setCursor({
          created_at: lastMessage.created_at,
          id: lastMessage.id
        });
      } else {
        setCursor(undefined);
      }

      setMessages(reversedMessages);
      setHasOlder(messagesData.length === pageSize);
      setIsLoadingOlder(false);

      return reversedMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
      setHasOlder(false);
      setIsLoadingOlder(false);
      return [];
    }
  }, [pageSize]);

  const loadOlderMessages = useCallback(async (
    threadId: string,
    context: 'global' | 'tenant',
    tenantId?: string
  ) => {
    if (!hasOlder || isLoadingOlder || !cursor) return;

    try {
      setIsLoadingOlder(true);

      const tableName = context === 'global' ? 'global_messages' : 'messages';
      
      // Select specific columns instead of * for better performance
      const selectColumns = 'id, thread_id, sender_id, body, message_type, content_data, created_at, updated_at';
      
      // Use type assertion to avoid TypeScript recursion
      let queryBuilder = supabase
        .from(tableName)
        .select(selectColumns)
        .eq('thread_id', threadId)
        .lt('created_at', cursor.created_at)
        .order('created_at', { ascending: false })
        .limit(pageSize) as any;

      if (context === 'tenant' && tenantId) {
        queryBuilder = queryBuilder.eq('tenant_id', tenantId);
      }

      const result = await queryBuilder;
      if (result.error) throw result.error;

      const olderMessagesData: any[] = result.data || [];

      if (olderMessagesData.length === 0) {
        setHasOlder(false);
        setIsLoadingOlder(false);
        return;
      }

      const reversedOlderMessages = [...olderMessagesData].reverse();
      
      if (olderMessagesData.length > 0) {
        const lastMessage = olderMessagesData[olderMessagesData.length - 1];
        setCursor({
          created_at: lastMessage.created_at,
          id: lastMessage.id
        });
      }

      setMessages(currentMessages => [...reversedOlderMessages, ...currentMessages]);
      setHasOlder(olderMessagesData.length === pageSize);
      setIsLoadingOlder(false);

    } catch (error) {
      console.error('Error loading older messages:', error);
      setIsLoadingOlder(false);
    }
  }, [hasOlder, isLoadingOlder, cursor, pageSize]);

  const addNewMessage = useCallback((message: MessageData) => {
    setMessages(currentMessages => [...currentMessages, message]);
  }, []);

  const shouldUsePagination = messages.length > paginationThreshold;
  const shouldUseVirtualization = messages.length > virtualizationThreshold;

  return {
    messages,
    hasOlder,
    isLoadingOlder,
    fetchInitialMessages,
    loadOlderMessages,
    addNewMessage,
    shouldUsePagination,
    shouldUseVirtualization,
    firstMessageRef,
    scrollContainerRef,
  };
}