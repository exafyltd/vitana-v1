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
  
  // Create unified sendMessage function
  const sendMessage = async (args: SendMessageArgs) => {
    if (args.context === 'global') {
      return globalMessages.sendMessage(args);
    } else {
      return tenantMessages.sendMessage(args);
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