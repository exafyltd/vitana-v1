import { useEffect, useRef, useCallback } from 'react';
import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

const ORB_SCRIPT_URL = "https://gateway-q74ibpv6ia-uc.a.run.app/command-hub/orb-widget.js";
const PENDING_OPEN_KEY = "vitana_orb_pending_open";

/**
 * Renders a placeholder FAB button that matches the external ORB widget's styling.
 * Shown when AI consent has not been granted — tapping opens the consent dialog.
 * Once consent is granted, this disappears and the real ORB widget takes over.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();
  const preloaded = useRef(false);

  // Preload the ORB widget script while the placeholder is visible
  useEffect(() => {
    if (preloaded.current || hasConsent || isLoading || !user) return;
    preloaded.current = true;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = ORB_SCRIPT_URL;
    document.head.appendChild(link);
  }, [hasConsent, isLoading, user]);

  // When user consents, signal that the overlay should auto-open
  const handleConsent = useCallback(() => {
    try { sessionStorage.setItem(PENDING_OPEN_KEY, 'true'); } catch {}
    grantConsent();
  }, [grantConsent]);

  // Don't show if: consent granted, still loading, or user not authenticated
  if (hasConsent || isLoading || !user) return null;

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
        onOpenChange={setDialogOpen}
        onConsent={handleConsent}
      />
    </>
  );
}
