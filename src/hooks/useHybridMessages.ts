import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";
import { useTypingIndicators } from "./useTypingIndicators";
import { prefetchMessages } from "./messageCache";

export type MessageKind = "text" | "image" | "file" | "system";

export type SendMessageArgs = {
  context: "global" | "tenant";
  threadId: string;
  content: string;
  type?: MessageKind;
  contentData?: Record<string, any>;
  recipientId?: string;
  parentMessageId?: string;
  actionButtons?: any[];
};

/**
 * Unified messaging hook that automatically routes to global or tenant context
 * based on the user's current role with WhatsApp-like message persistence
 */
export function useHybridMessages(forceContext?: 'global' | 'tenant', threadId?: string | null) {
  const { currentRole } = useRole();

  // Route to appropriate context based on role or forced context
  const isGlobalContext = forceContext === 'global' || 
    (forceContext !== 'tenant' && currentRole === 'community');

  const globalMessages = useGlobalMessages(threadId, isGlobalContext);
  const tenantMessages = useTenantMessages(threadId, !isGlobalContext);
  
  const context = isGlobalContext ? 'global' : 'tenant';
  const { typingUsers, startTyping, stopTyping } = useTypingIndicators(threadId, context);
  
  const sendMessage = async (args: SendMessageArgs) => {
    // Include parent_message_id if provided
    const messageArgs = {
      ...args,
      parentMessageId: args.parentMessageId
    };
    
    if (args.context === 'global') {
      return globalMessages.sendMessage(messageArgs);
    } else {
      return tenantMessages.sendMessage(messageArgs);
    }
  };

  // Prefetch messages for a given thread (for hover prefetching)
  const prefetchThreadMessages = async (threadId: string) => {
    if (isGlobalContext) {
      return prefetchMessages(
        threadId, 
        'global', 
        globalMessages.fetchMessages
      );
    } else {
      return prefetchMessages(
        threadId, 
        'tenant', 
        tenantMessages.fetchMessages
      );
    }
  };

  if (isGlobalContext) {
    return {
      ...globalMessages,
      sendMessage,
      prefetchThreadMessages,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'global' as const,
      isFetching: globalMessages.isFetching,
    };
  } else {
    return {
      ...tenantMessages,
      sendMessage,
      prefetchThreadMessages,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'tenant' as const,
      isFetching: tenantMessages.isFetching,
    };
  }
}