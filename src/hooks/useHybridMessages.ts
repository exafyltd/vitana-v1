import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";
import { useTypingIndicators } from "./useTypingIndicators";
import { instrumentRealtimeEvent, perfTracker } from "@/lib/diagnostics";
import { messageOutbox } from "@/lib/messageOutbox";
import { useEffect } from "react";

export type MessageKind = "text" | "image" | "file" | "system" | "attachment";

export type SendMessageArgs = {
  context: "global" | "tenant";
  threadId: string;
  content: string;
  type?: MessageKind;
  contentData?: Record<string, any>;
  recipientId?: string;
};

/**
 * Unified messaging hook that automatically routes to global or tenant context
 * based on the user's current role with WhatsApp-like message persistence
 */
export function useHybridMessages(forceContext?: 'global' | 'tenant', threadId?: string) {
  const { currentRole } = useRole();
  const globalMessages = useGlobalMessages();
  const tenantMessages = useTenantMessages();

  // Route to appropriate context based on role or forced context
  const isGlobalContext = forceContext === 'global' || 
    (forceContext !== 'tenant' && currentRole === 'community');
  
  const context = isGlobalContext ? 'global' : 'tenant';
  const { typingUsers, startTyping, stopTyping } = useTypingIndicators(threadId, context);

  // Register send functions with outbox for offline support
  useEffect(() => {
    messageOutbox.registerSendFunction('global', globalMessages.sendMessage);
    messageOutbox.registerSendFunction('tenant', tenantMessages.sendMessage);
  }, [globalMessages.sendMessage, tenantMessages.sendMessage]);
  
  // Create unified sendMessage function with offline support
  const sendMessage = async (args: SendMessageArgs) => {
    const operationId = `send-${Date.now()}`;
    perfTracker.start(operationId);
    
    instrumentRealtimeEvent('send', {
      threadId: args.threadId,
      content: args.content
    });

    try {
      // Check if we're online - if not, queue the message
      if (!navigator.onLine) {
        const idempotency_key = await messageOutbox.enqueueMessage(args);
        
        perfTracker.end(operationId, 'ack', {
          threadId: args.threadId,
          content: '[QUEUED] ' + args.content
        });
        
        // Return a temp message ID for optimistic UI
        return { 
          id: `temp-${idempotency_key}`,
          idempotency_key,
          status: 'queued'
        };
      }

      // Try to send immediately
      let result;
      try {
        if (args.context === 'global') {
          result = await globalMessages.sendMessage(args);
        } else {
          result = await tenantMessages.sendMessage(args);
        }
        
        perfTracker.end(operationId, 'ack', {
          threadId: args.threadId,
          content: args.content
        });
        
        return result;
      } catch (error) {
        // If send fails, queue the message for retry
        const idempotency_key = await messageOutbox.enqueueMessage(args);
        
        instrumentRealtimeEvent('error', {
          threadId: args.threadId,
          error: `Send failed, queued for retry: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        // Return a temp message ID for optimistic UI
        return { 
          id: `temp-${idempotency_key}`,
          idempotency_key,
          status: 'queued'
        };
      }
    } catch (error) {
      instrumentRealtimeEvent('error', {
        threadId: args.threadId,
        error: error instanceof Error ? error.message : 'Send failed'
      });
      throw error;
    }
  };

  if (isGlobalContext) {
    return {
      ...globalMessages,
      sendMessage,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'global' as const,
    };
  } else {
    return {
      ...tenantMessages,
      sendMessage,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'tenant' as const,
    };
  }
}