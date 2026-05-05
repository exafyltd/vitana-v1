import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { usePopupCoordination } from '@/hooks/usePopupCoordination';
import { t } from '@/lib/i18n-toast';

interface PopupCoordinationWrapperProps {
  children: React.ReactNode;
  popupType: 'wallet-generic' | 'wallet-integrated' | 'wallet-master';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function PopupCoordinationWrapper({
  children,
  popupType,
  isOpen,
  onClose,
  title = "Wallet Action"
}: PopupCoordinationWrapperProps) {
  const { getCurrentPopup, canShowPopup } = usePopupCoordination();
  const currentPopup = getCurrentPopup();
  
  // If this popup is blocked by a higher priority popup, show a message instead
  if (isOpen && !canShowPopup(popupType) && currentPopup?.type !== popupType) {
    const isIntegratedActive = currentPopup?.type === 'wallet-integrated';
    const recipientName = currentPopup?.context?.recipient?.name;
    
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isIntegratedActive && recipientName ? (
                  <>{t('screens.payment.conversationspecificPaymentActionWith')} <strong>{recipientName}</strong>{t('screens.payment.alreadyActivePleaseCompleteCloseThat')}
                  </>
                ) : (
                  <>{t('screens.payment.anotherWalletActionCurrentlyProgressPlease')}
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If this popup is allowed or is the active popup, render normally
  if (isOpen && (canShowPopup(popupType) || currentPopup?.type === popupType)) {
    return <>{children}</>;
  }

  // Don't render if not open
  return null;
}