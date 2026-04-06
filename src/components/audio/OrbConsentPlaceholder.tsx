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
        className="vtorb-fab"
        onClick={() => setDialogOpen(true)}
        aria-label="Open Vitana Voice — consent required"
      />
      <AIDataConsentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConsent={grantConsent}
      />
    </>
  );
}
