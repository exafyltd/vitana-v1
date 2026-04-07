import { useEffect, useRef, useCallback, useState } from 'react';
import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

const PENDING_OPEN_KEY = "vitana_orb_pending_open";

/**
 * Intercepts clicks on the real ORB FAB for authenticated users without consent.
 * Uses a document-level capturing event listener — NO extra DOM elements on the page,
 * so the ORB's appearance is completely unchanged.
 *
 * When consent is needed and user taps the ORB:
 *   - Click is captured before the widget handles it
 *   - Consent dialog opens
 *   - After "I Agree" → ORB overlay opens automatically
 *
 * When consent is already granted: does nothing, clicks pass through normally.
 * For anonymous users: does nothing, ORB works as before.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();
  const [needsConsent, setNeedsConsent] = useState(false);

  // Track whether consent interception is active
  useEffect(() => {
    setNeedsConsent(!!user && !hasConsent && !isLoading);
  }, [user, hasConsent, isLoading]);

  // Use a ref so the event listener always sees the latest value
  const needsConsentRef = useRef(false);
  useEffect(() => {
    needsConsentRef.current = needsConsent;
  }, [needsConsent]);

  const setDialogOpenRef = useRef(setDialogOpen);
  useEffect(() => {
    setDialogOpenRef.current = setDialogOpen;
  }, [setDialogOpen]);

  // Attach capturing event listener to intercept ORB FAB clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!needsConsentRef.current) return;

      // Check if the click target is the ORB FAB
      const target = e.target as HTMLElement;
      if (!target) return;
      const isFab = target.classList.contains('vtorb-fab') ||
                    target.closest('.vtorb-fab') !== null;
      if (!isFab) return;

      // Intercept — prevent the widget from opening
      e.stopPropagation();
      e.preventDefault();

      // Open consent dialog
      setDialogOpenRef.current(true);
    }

    document.addEventListener('click', handleClick, true); // true = capturing phase
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  const handleConsent = useCallback(() => {
    try { sessionStorage.setItem(PENDING_OPEN_KEY, 'true'); } catch {}
    grantConsent();
  }, [grantConsent]);

  // Only render the dialog — no visible DOM elements
  return (
    <AIDataConsentDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onConsent={handleConsent}
    />
  );
}
