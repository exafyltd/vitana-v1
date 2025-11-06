import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle } from 'lucide-react';

interface HealthConsentGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionDescription: string;
  onConsent: () => void;
}

export function HealthConsentGate({ open, onOpenChange, actionDescription, onConsent }: HealthConsentGateProps) {
  const [accepted, setAccepted] = useState(false);

  const handleConsent = () => {
    console.log('[HIPAA Audit] User consented to:', actionDescription);
    
    onConsent();
    onOpenChange(false);
    setAccepted(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Health Data Consent Required
          </DialogTitle>
          <DialogDescription>
            You're about to {actionDescription}. This action requires your explicit consent.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Shield className="w-4 h-4" />
          <AlertDescription>
            Your health data is protected under HIPAA. By proceeding, you consent to this specific action only.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>You can revoke this consent at any time</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>This consent is logged for your security</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Recipients must comply with privacy regulations</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConsent}>
            I Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
