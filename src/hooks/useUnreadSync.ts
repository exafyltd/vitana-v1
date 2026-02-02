import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { isTabVisible } from '@/utils/realtimeDebounce';

/**
 * Cross-tab unread count synchronization hook
 * Listens for real-time unread updates and syncs across browser tabs
 * Optimized with debouncing to reduce DB operations
 */
export function useUnreadSync(
  onThreadRead: (threadId: string, context: 'global' | 'tenant') => void,
  onUnreadChange: (threadId: string, context: 'global' | 'tenant', tenantId?: string) => void
) {
  const { user } = useAuth();
  
  // Debounce timers
  const unreadChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChanges = useRef<Map<string, { context: 'global' | 'tenant'; tenantId?: string }>>(new Map());

  // Batched debounced unread change handler
  const processPendingChanges = useCallback(() => {
    if (!isTabVisible()) return;
    
    pendingChanges.current.forEach((data, threadId) => {
      onUnreadChange(threadId, data.context, data.tenantId);
    });
    pendingChanges.current.clear();
  }, [onUnreadChange]);

  const debouncedUnreadChange = useCallback((threadId: string, context: 'global' | 'tenant', tenantId?: string) => {
    // Batch multiple changes
    pendingChanges.current.set(threadId, { context, tenantId });
    
    if (unreadChangeTimerRef.current) {
      clearTimeout(unreadChangeTimerRef.current);
    }
    unreadChangeTimerRef.current = setTimeout(() => {
      processPendingChanges();
      unreadChangeTimerRef.current = null;
    }, 2000);
  }, [processPendingChanges]);

  // Set up real-time sync for unread count changes
  useEffect(() => {
    if (!user) return;

    const unreadSyncChannel = supabase
      .channel('unread_sync')
      .on('broadcast', { event: 'thread_read' }, (payload) => {
        const { threadId, userId, context } = payload.payload;
        
        // Only sync if it's from another user or another tab
        if (userId === user.id && isTabVisible()) {
          onThreadRead(threadId, context);
        }
      })
      .on('broadcast', { event: 'unread_change' }, (payload) => {
        const { threadId, context, tenantId } = payload.payload;
        debouncedUnreadChange(threadId, context, tenantId);
      })
      .subscribe();

    // Subscribe to participant changes for real-time unread updates
    // Using UPDATE only (not *) to reduce event volume
    const participantChannel = supabase
      .channel('participant_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'thread_participants',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const { thread_id } = payload.new as any;
        debouncedUnreadChange(thread_id, 'tenant');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'global_thread_participants', 
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const { thread_id } = payload.new as any;
        debouncedUnreadChange(thread_id, 'global');
      })
      .subscribe();

    return () => {
      if (unreadChangeTimerRef.current) clearTimeout(unreadChangeTimerRef.current);
      supabase.removeChannel(unreadSyncChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user, onThreadRead, debouncedUnreadChange]);

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
