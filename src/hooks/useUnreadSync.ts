import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cross-tab unread count synchronization hook
 * Listens for real-time unread updates and syncs across browser tabs
 */
export function useUnreadSync(
  onThreadRead: (threadId: string, context: 'global' | 'tenant') => void,
  onUnreadChange: (threadId: string, context: 'global' | 'tenant', tenantId?: string) => void
) {
  const { user } = useAuth();

  // Set up real-time sync for unread count changes
  useEffect(() => {
    if (!user) return;

    const unreadSyncChannel = supabase
      .channel('unread_sync')
      .on('broadcast', { event: 'thread_read' }, (payload) => {
        const { threadId, userId, context } = payload.payload;
        
        // Only sync if it's from another user or another tab
        if (userId === user.id) {
          onThreadRead(threadId, context);
        }
      })
      .on('broadcast', { event: 'unread_change' }, (payload) => {
        const { threadId, context, tenantId } = payload.payload;
        onUnreadChange(threadId, context, tenantId);
      })
      .subscribe();

    // Subscribe to participant changes for real-time unread updates
    const participantChannel = supabase
      .channel('participant_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'thread_participants',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const { thread_id } = payload.new as any;
        onUnreadChange(thread_id, 'tenant');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'global_thread_participants', 
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const { thread_id } = payload.new as any;
        onUnreadChange(thread_id, 'global');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(unreadSyncChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user, onThreadRead, onUnreadChange]);

  // Broadcast unread change to sync across tabs/devices
  const broadcastUnreadChange = useCallback(async (
    threadId: string, 
    context: 'global' | 'tenant',
    tenantId?: string
  ) => {
    if (!user) return;

    try {
      await supabase.channel('unread_sync').send({
        type: 'broadcast',
        event: 'unread_change',
        payload: { 
          threadId, 
          context,
          tenantId,
          userId: user.id,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error broadcasting unread change:', error);
    }
  }, [user]);

  return { broadcastUnreadChange };
}