import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "./useRole";
import { useTenant } from "./useTenant";
import { useHybridMessages } from "./useHybridMessages";
import { supabase } from "@/integrations/supabase/client";

/**
 * Optimized hybrid messaging hook that wraps useHybridMessages
 * with better synchronization and immediate UI updates
 */
export function useOptimizedHybridMessages(forceContext?: 'global' | 'tenant') {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  
  // Use the existing hybrid messages hook
  const hybridMessages = useHybridMessages(forceContext);
  
  // Enhanced threads state with optimistic updates
  const [optimizedThreads, setOptimizedThreads] = useState(hybridMessages.threads);
  
  // Sync optimized threads when hybrid messages threads change
  useEffect(() => {
    setOptimizedThreads(hybridMessages.threads);
  }, [hybridMessages.threads]);

  // Optimistically update thread with new message
  const updateThreadWithMessage = useCallback((threadId: string, message: any) => {
    setOptimizedThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          last_message: message,
          updated_at: message.created_at || new Date().toISOString(),
        };
      }
      return thread;
    }));
    
    // Also update the original threads after a small delay
    setTimeout(() => {
      hybridMessages.fetchThreads();
    }, 100);
  }, [hybridMessages.fetchThreads]);

  // Enhanced sendMessage with immediate thread update
  const optimizedSendMessage = useCallback(async (args: any) => {
    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        thread_id: args.threadId,
        sender_id: user?.id,
        body: args.content,
        message_type: args.type || 'text',
        content_data: args.contentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Immediately update thread in local state
      updateThreadWithMessage(args.threadId, optimisticMessage);
      
      // Send the actual message
      const result = await hybridMessages.sendMessage(args);
      
      return result;
    } catch (error) {
      // Revert optimistic update on error
      hybridMessages.fetchThreads();
      throw error;
    }
  }, [hybridMessages.sendMessage, updateThreadWithMessage, user?.id]);

  // Enhanced markAsRead with immediate local update
  const optimizedMarkAsRead = useCallback(async (threadId: string) => {
    try {
      // Immediately update local state
      setOptimizedThreads(prev => prev.map(thread =>
        thread.id === threadId
          ? { ...thread, unread_count: 0 }
          : thread
      ));

      // Update database
      const now = new Date().toISOString();
      const participantTable = hybridMessages.context === 'global' 
        ? 'global_thread_participants' 
        : 'thread_participants';
      
      await supabase
        .from(participantTable)
        .update({ last_read_at: now })
        .eq('thread_id', threadId)
        .eq('user_id', user?.id);

    } catch (error) {
      console.error('Error in optimized markAsRead:', error);
      // Revert on error
      hybridMessages.fetchThreads();
    }
  }, [hybridMessages.context, hybridMessages.fetchThreads, user?.id]);

  return {
    ...hybridMessages,
    threads: optimizedThreads,
    sendMessage: optimizedSendMessage,
    markAsRead: optimizedMarkAsRead,
    updateThreadWithMessage,
  };
}