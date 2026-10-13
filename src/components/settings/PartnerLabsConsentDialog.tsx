/**
 * VTID-03885 — Partner Health Test Integration: the "connect a lab partner"
 * consent dialog, opened from Settings › Connected Apps.
 *
 * VTID-05093 (Health Hub D10, WP2): now a thin wrapper over
 * `HealthConsentDialog` for the per-partner `partner_results` consent. The
 * partner comes in as a prop (any partner the gateway lists in
 * GET /api/v1/health/consents, not one hard-coded partner), and the grant
 * records the wording version and displayed locale (gateway VTID-05092,
 * `/api/v1/health/consents/grant`). Revoking stops future ingestion only.
 */
import { HealthConsentDialog } from '@/components/settings/HealthConsentDialog';
import type { ConsentGrantedVia } from '@/hooks/useHealthConsents';

interface PartnerLabsConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `partner_registry.partner_key` of the partner. */
  partnerKey: string | null;
  /** Display name shown in the copy. */
  partnerName?: string | null;
  grantedVia?: ConsentGrantedVia;
  onConnectedChange?: (connected: boolean) => void;
}

export function PartnerLabsConsentDialog({
  open,
  onOpenChange,
  partnerKey,
  partnerName,
  grantedVia = 'settings_connected_apps',
  onConnectedChange,
}: PartnerLabsConsentDialogProps) {
  if (!partnerKey) return null;
  return (
    <HealthConsentDialog
      open={open}
      onOpenChange={onOpenChange}
      category="partner_results"
      resourceId={partnerKey}
      resourceName={partnerName}
      grantedVia={grantedVia}
      onChanged={onConnectedChange}
    />
  );
}

export default PartnerLabsConsentDialog;
