/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — opens the
 * ORB from a screen, the native form of web `activateOrb()`
 * (src/lib/orbActivate.ts), which the Vitana DM's "Talk to Vitana" button calls
 * (ConversationView.tsx:1273). The native ORB (N6d, src/orb/ui) owns the
 * session; this port only reaches its controller. Without an ORB provider
 * (a test tree, or a build without the ORB) it returns false, as the web does
 * when `window.VitanaOrb` is missing.
 */
import { useCallback } from 'react';
import { useOrbSession } from '../orb/ui/OrbProvider';

export function useActivateOrb(): () => boolean {
  const { controller } = useOrbSession();
  return useCallback(() => {
    if (!controller) return false;
    void controller.open();
    return true;
  }, [controller]);
}
