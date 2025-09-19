import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";
import { useTypingIndicators } from "./useTypingIndicators";
import { instrumentRealtimeEvent, perfTracker } from "@/lib/diagnostics";

export type MessageKind = "text" | "image" | "file" | "system";

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
  
  // Create unified sendMessage function with instrumentation
  const sendMessage = async (args: SendMessageArgs) => {
    const operationId = `send-${Date.now()}`;
    perfTracker.start(operationId);
    
    instrumentRealtimeEvent('send', {
      threadId: args.threadId,
      content: args.content
    });

    try {
      let result;
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