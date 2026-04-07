import { useEffect, useCallback } from 'react';
import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

const PENDING_OPEN_KEY = "vitana_orb_pending_open";

/**
 * For authenticated users without AI consent:
 * Places an invisible click interceptor over the real ORB FAB.
 * When tapped, the consent dialog opens instead of the ORB session.
 * After consent, the interceptor disappears and the real ORB works normally.
 *
 * The ORB itself is NEVER hidden or replaced — it's always visible.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();

  const needsConsent = !!user && !hasConsent && !isLoading;

  // When consent dialog opens, set body attribute to suppress ORB overlay behind it
  useEffect(() => {
    if (dialogOpen) {
      document.body.setAttribute('data-consent-dialog-open', 'true');
    } else {
      document.body.removeAttribute('data-consent-dialog-open');
    }
    return () => document.body.removeAttribute('data-consent-dialog-open');
  }, [dialogOpen]);

  const handleConsent = useCallback(() => {
    try { sessionStorage.setItem(PENDING_OPEN_KEY, 'true'); } catch {}
    grantConsent();
  }, [grantConsent]);

  if (!needsConsent) return null;

  // Invisible interceptor positioned exactly over the real ORB FAB
  // Uses the same CSS class for positioning, but is transparent and on top
  return (
    <>
      <div
        className="vtorb-fab"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setDialogOpen(true);
        }}
        aria-label="Open Vitana Voice — consent required"
        role="button"
        tabIndex={0}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          position: 'fixed',
        }}
      />
      <AIDataConsentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConsent={handleConsent}
      />
    </>
  );
}
