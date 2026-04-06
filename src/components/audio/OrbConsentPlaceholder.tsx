import { useAIConsent } from '@/hooks/useAIConsent';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

/**
 * Renders a placeholder FAB button that matches the external ORB widget's styling.
 * Shown when AI consent has not been granted — tapping opens the consent dialog.
 * Once consent is granted, this disappears and the real ORB widget takes over.
 */
export function OrbConsentPlaceholder() {
  const { hasConsent, isLoading, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();

  // Don't show if consent is granted (real widget handles it) or still loading
  if (hasConsent || isLoading) return null;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        aria-label="Open Vitana Voice — consent required"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9000,
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'radial-gradient(circle at 35% 35%, #7c8db5, #5a6a8a 50%, #3a4a6a 100%)',
          boxShadow: '0 4px 24px rgba(90,110,150,0.5), inset 0 1px 2px rgba(255,255,255,0.15)',
          transition: 'transform 0.2s, box-shadow 0.2s',
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
