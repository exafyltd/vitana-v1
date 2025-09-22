import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";
import { useTypingIndicators } from "./useTypingIndicators";

export type MessageKind = "text" | "image" | "file" | "system";

export type SendMessageArgs = {
  context: "global" | "tenant";
  threadId: string;
  content: string;
  type?: MessageKind;
  contentData?: Record<string, any>;
  recipientId?: string;
  parentMessageId?: string;
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