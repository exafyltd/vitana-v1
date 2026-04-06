import { useAIConsent } from '@/hooks/useAIConsent';
import { useAuth } from '@/context/AuthProvider';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

/**
 * Renders a placeholder FAB button that matches the external ORB widget's styling.
 * Shown when AI consent has not been granted — tapping opens the consent dialog.
 * Once consent is granted, this disappears and the real ORB widget takes over.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const { user } = useAuth();

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
