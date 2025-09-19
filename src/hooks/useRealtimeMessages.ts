import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export function useRealtimeMessages(
  threadId: string | null,
  context: 'global' | 'tenant',
  onNewMessage?: (message: any) => void,
  onMessageUpdate?: (message: any) => void
) {
  const { user } = useAuth();

  const handleMessageInsert = useCallback((payload: any) => {
    console.log('Real-time message insert:', payload);
    if (onNewMessage) {
      onNewMessage(payload.new);
    }
  }, [onNewMessage]);

  const handleMessageUpdate = useCallback((payload: any) => {
    console.log('Real-time message update:', payload);
    if (onMessageUpdate) {
      onMessageUpdate(payload.new);
    }
  }, [onMessageUpdate]);

  useEffect(() => {
    if (!threadId || !user) return;

    const tableName = context === 'global' ? 'global_messages' : 'messages';
    const channelName = `messages_${context}_${threadId}`;

    console.log('Setting up real-time subscription for:', { threadId, context, tableName });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `thread_id=eq.${threadId}`,
        },
        handleMessageInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `thread_id=eq.${threadId}`,
        },
        handleMessageUpdate
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription for:', channelName);
      supabase.removeChannel(channel);
    };
  }, [threadId, context, user, handleMessageInsert, handleMessageUpdate]);
}