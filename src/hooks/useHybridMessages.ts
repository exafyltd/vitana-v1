import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";
import { useTypingIndicators } from "./useTypingIndicators";

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
  
  if (isGlobalContext) {
    return {
      ...globalMessages,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'global' as const,
    };
  } else {
    return {
      ...tenantMessages,
      typingUsers,
      startTyping,
      stopTyping,
      context: 'tenant' as const,
    };
  }
}