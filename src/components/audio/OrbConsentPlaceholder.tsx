import { useEffect, useCallback } from 'react';
import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

const PENDING_OPEN_KEY = "vitana_orb_pending_open";

/**
 * For authenticated users without AI consent:
 * - Hides the real ORB FAB (via body attribute + CSS)
 * - Shows a matching placeholder FAB that opens the consent dialog
 * - After consent, real ORB takes over
 *
 * For unauthenticated users: does nothing (real ORB works normally)
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();

  // Set body attribute to hide real ORB FAB when placeholder is active
  const showPlaceholder = !!user && !hasConsent && !isLoading;
  useEffect(() => {
    if (showPlaceholder) {
      document.body.setAttribute('data-orb-consent-pending', 'true');
    } else {
      document.body.removeAttribute('data-orb-consent-pending');
    }
    return () => document.body.removeAttribute('data-orb-consent-pending');
  }, [showPlaceholder]);

  const handleConsent = useCallback(() => {
    try { sessionStorage.setItem(PENDING_OPEN_KEY, 'true'); } catch {}
    grantConsent();
  }, [grantConsent]);

  if (!showPlaceholder) return null;

  return (
    <>
      <button
        className="vtorb-fab"
        onClick={() => setDialogOpen(true)}
        aria-label="Open Vitana Voice — consent required"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'radial-gradient(circle at 35% 35%, #7c8db5, #5a6a8a 50%, #3a4a6a 100%)',
          boxShadow: '0 4px 24px rgba(90,110,150,0.5), inset 0 1px 2px rgba(255,255,255,0.15)',
        }}
      />
      <AIDataConsentDialog
        open={dialogOpen}
        onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen && !hasConsent) {
            // User dismissed without consenting — no action needed
          }
        }}
        onConsent={handleConsent}
      />
    </>
  );
}
