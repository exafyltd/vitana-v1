import { useState } from 'react';
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogDescription, 
  ResponsiveDialogHeader, 
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle 
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { applyReplacements } from '@/lib/i18n-helpers';

interface HealthConsentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionDescription: string;
  onConsent: () => void;
}

export function HealthConsentGate({ open, onOpenChange, actionDescription, onConsent }: HealthConsentGateProps) {
  const [accepted, setAccepted] = useState(false);
  const { translate } = useTranslation();

  const handleConsent = () => {
    // Log to audit trail (not analytics) with structured data
    const auditEntry = {
      consent_id: crypto.randomUUID(),
      action_id: `consent_${Date.now()}`,
      timestamp: new Date().toISOString(),
      scope: actionDescription,
      user_accepted: true
    };
    
    // Store in separate audit log (not g1_analytics_events)
    const auditLogs = JSON.parse(localStorage.getItem('vitana_consent_audit') || '[]');
    auditLogs.push(auditEntry);
    localStorage.setItem('vitana_consent_audit', JSON.stringify(auditLogs));
    
    if (import.meta.env.DEV) {
      console.log('[Consent Audit]', auditEntry);
    }
    
    onConsent();
    onOpenChange(false);
    setAccepted(false);
  };

  const descriptionText = applyReplacements(
    translate('consent.dataAccess.description', "You're about to {action}. This action requires your explicit consent."),
    { action: actionDescription }
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            {translate('consent.dataAccess.title', 'Data Access Consent Required')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {descriptionText}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              {translate('consent.dataAccess.gdprNotice', 'Your personal data is protected by privacy regulations (GDPR, HIPAA, PDPA). By proceeding, you consent to this specific action only.')}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm mt-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{translate('consent.dataAccess.revokeAnytime', 'You can revoke this consent at any time')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{translate('consent.dataAccess.loggedForSecurity', 'This consent is logged for your security')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{translate('consent.dataAccess.recipientsComply', 'Recipients must comply with privacy regulations')}</span>
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('buttons.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConsent}>
            {translate('consent.dataAccess.iConsent', 'I Consent')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
