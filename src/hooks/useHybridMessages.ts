import { useRole } from "./useRole";
import { useGlobalMessages } from "./useGlobalMessages";
import { useTenantMessages } from "./useTenantMessages";

/**
 * Unified messaging hook that automatically routes to global or tenant context
 * based on the user's current role with WhatsApp-like message persistence
 */
export function useHybridMessages() {
  const { currentRole } = useRole();
  const globalMessages = useGlobalMessages();
  const tenantMessages = useTenantMessages();

  // Route to appropriate context based on role
  const isGlobalContext = currentRole === 'community';
  
  if (isGlobalContext) {
    return {
      ...globalMessages,
      context: 'global' as const,
    };
  } else {
    return {
      ...tenantMessages,
      context: 'tenant' as const,
    };
  }
}