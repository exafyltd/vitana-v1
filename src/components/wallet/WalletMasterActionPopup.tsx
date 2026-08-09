import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  ArrowUpDown,
  Zap,
  Wallet,
} from "lucide-react";
import { ExchangeStep } from './steps/ExchangeStep';
import { SendStep } from './steps/SendStep';
import { ExchangeAndSendStep } from './steps/ExchangeAndSendStep';
import { isIAPRestricted } from '@/lib/appilix';
import { t } from '@/lib/i18n-toast';

interface WalletMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: StepType;
  selectedCurrency?: 'USD' | 'VTNA' | 'CREDITS';
}

type StepType = 'menu' | 'exchange' | 'send' | 'exchange-and-send';

// NOTE: this popup previously also offered "Buy Credits" / "Buy Tokens" /
// "Claim Rewards" / "Withdraw & Cash Out" quick actions that called
// updateBalance() directly with hardcoded amounts and no real payment or
// withdrawal behind them — free money on tap, and a fake "withdrawal" that
// silently destroyed real USD balance. Removed; the real, working
// equivalents (Stripe-backed BuyCreditsPopup, logged WithdrawPopup) are
// wired directly on the Wallet balance cards.
export function WalletMasterActionPopup({ open, onOpenChange, initialStep, selectedCurrency }: WalletMasterActionPopupProps) {
  const [currentStep, setCurrentStep] = useState<StepType>(initialStep || 'menu');

  // Reset to initial step or menu when popup opens
  useEffect(() => {
    if (open) {
      setCurrentStep(initialStep || 'menu');
    }
  }, [open, initialStep]);

  const handleStepNavigation = (step: StepType) => {
    setCurrentStep(step);
  };

  const handleBack = () => {
    setCurrentStep('menu');
  };

  const handleClose = () => {
    setCurrentStep('menu');
    onOpenChange(false);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'exchange':
        return <ExchangeStep onBack={handleBack} onClose={handleClose} initialCurrency={selectedCurrency as 'USD' | 'VTNA' | 'CREDITS'} />;
      case 'send':
        return <SendStep onBack={handleBack} onClose={handleClose} />;
      case 'exchange-and-send':
        return <ExchangeAndSendStep onBack={handleBack} onClose={handleClose} />;
      default:
        return renderMenu();
    }
  };

  const renderMenu = () => {
    const restricted = isIAPRestricted();

    return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          {t('screens.wallet.walletActions')}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4">
        {/* Transfer & Convert Section — hidden on iOS (prototype features) */}
        {!restricted && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('screens.wallet.transferConvert')}</h4>
          <div className="grid gap-2">            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleStepNavigation('send')}
            >
              <Send className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{t('screens.wallet.sendFunds')}</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.sendCommunityMembers')}</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleStepNavigation('exchange')}
            >
              <ArrowUpDown className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">{t('screens.wallet.exchangeCurrency')}</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.convertBetweenCreditsVtnaUsd')}</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3 bg-gradient-to-r from-purple-50/30 to-blue-50/30 border-purple-200/50"
              onClick={() => handleStepNavigation('exchange-and-send')}
            >
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-purple-700">{t('screens.wallet.exchangeSend')}</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.convertCurrencySendOneStep')}</div>
              </div>
              <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">{t('screens.wallet.quick')}</Badge>
            </Button>
          </div>
        </div>
        )}
      </div>
    </>
  );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {renderCurrentStep()}
      </DialogContent>
    </Dialog>
  );
}