import { useEffect, useRef } from 'react';
import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

const ORB_SCRIPT_URL = "https://gateway-q74ibpv6ia-uc.a.run.app/command-hub/orb-widget.js";

/**
 * Renders a placeholder FAB button that matches the external ORB widget's styling.
 * Shown when AI consent has not been granted — tapping opens the consent dialog.
 * Once consent is granted, this stays visible until the real ORB widget takes over.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();
  const preloaded = useRef(false);

  // Preload the ORB widget script while the placeholder is visible
  // This downloads the JS in the background so it's cached when consent is granted
  useEffect(() => {
    if (preloaded.current || hasConsent || isLoading || !user) return;
    preloaded.current = true;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = ORB_SCRIPT_URL;
    document.head.appendChild(link);
  }, [hasConsent, isLoading, user]);

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
        onConsent={grantConsent}
      />
    </>
  );
}
