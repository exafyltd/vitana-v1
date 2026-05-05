import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Coins,
  Send,
  ArrowUpDown,
  Banknote,
  Settings,
  Gift,
  Plus,
  Wallet,
  Zap,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { ExchangeStep } from './steps/ExchangeStep';
import { SendStep } from './steps/SendStep';
import { ExchangeAndSendStep } from './steps/ExchangeAndSendStep';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError } from '@/lib/i18n-toast';

interface WalletMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: StepType;
  selectedCurrency?: 'USD' | 'VTNA' | 'CREDITS';
}

type StepType = 'menu' | 'exchange' | 'send' | 'exchange-and-send' | 'buy-credits' | 'buy-tokens';

export function WalletMasterActionPopup({ open, onOpenChange, initialStep, selectedCurrency }: WalletMasterActionPopupProps) {
  const { updateBalance } = useWallet();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<StepType>(initialStep || 'menu');
  const [loading, setLoading] = useState<string | null>(null);

  // Reset to initial step or menu when popup opens
  useEffect(() => {
    if (open) {
      setCurrentStep(initialStep || 'menu');
    }
  }, [open, initialStep]);

  const handleQuickAction = async (actionType: string) => {
    setLoading(actionType);
    
    try {
      switch (actionType) {
        case 'buy-credits':
          await updateBalance('CREDITS', 100, 'add');
          notify('toasts.wallet.creditsPurchased', 'toasts.wallet.added100CreditsYourWallet');
          break;

        case 'buy-tokens':
          await updateBalance('VTNA', 50, 'add');
          notify('toasts.wallet.tokensPurchased', 'toasts.wallet.added50VtnaTokensYourWallet');
          break;

        case 'claim-rewards':
          await updateBalance('VTNA', 25, 'add');
          notify('toasts.wallet.rewardsClaimed', 'toasts.wallet.added25VtnaRewardsYourWallet');
          break;

        case 'withdraw-cashout':
          await updateBalance('USD', 50, 'subtract');
          notify('toasts.wallet.withdrawalInitiated', 'toasts.wallet.withdrawalRequestSubmittedForProcessing');
          break;
      }
    } catch (error) {
      notifyError('toasts.wallet.actionFailed2');
    } finally {
      setLoading(null);
      onOpenChange(false);
    }
  };

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
          Wallet Actions
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4">
        {/* Buy & Add Section — hidden on iOS (prototype features) */}
        {!restricted && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Purchase & Add Funds</h4>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleQuickAction('buy-credits')}
              disabled={loading === 'buy-credits'}
            >
              {loading === 'buy-credits' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Buy Credits</div>
                <div className="text-xs text-muted-foreground">Add 100 credits to your account</div>
              </div>
              <Badge variant="secondary" className="ml-auto">Popular</Badge>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleQuickAction('buy-tokens')}
              disabled={loading === 'buy-tokens'}
            >
              {loading === 'buy-tokens' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
            <div className="text-left">
              <div className="font-medium">Buy Tokens</div>
              <div className="text-xs text-muted-foreground">Add 50 VTNA tokens</div>
            </div>
            </Button>
          </div>
        </div>
        )}

        {!restricted && <Separator />}

        {/* Transfer & Convert Section — hidden on iOS (prototype features) */}
        {!restricted && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Transfer & Convert</h4>
          <div className="grid gap-2">            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleStepNavigation('send')}
            >
              <Send className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Send Funds</div>
                <div className="text-xs text-muted-foreground">Send to community members</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleStepNavigation('exchange')}
            >
              <ArrowUpDown className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Exchange Currency</div>
                <div className="text-xs text-muted-foreground">Convert between Credits, VTNA, USD</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3 bg-gradient-to-r from-purple-50/30 to-blue-50/30 border-purple-200/50"
              onClick={() => handleStepNavigation('exchange-and-send')}
            >
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-purple-700">Exchange & Send</div>
                <div className="text-xs text-muted-foreground">Convert currency and send in one step</div>
              </div>
              <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">Quick</Badge>
            </Button>
          </div>
        </div>
        )}

        {!restricted && <Separator />}

        {/* Withdraw & Manage Section — hidden on iOS (prototype features) */}
        {!restricted && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Withdraw & Manage</h4>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleQuickAction('withdraw-cashout')}
              disabled={loading === 'withdraw-cashout'}
            >
              {loading === 'withdraw-cashout' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Withdraw / Cash Out</div>
                <div className="text-xs text-muted-foreground">Transfer $50 to bank account</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start gap-3 h-auto py-3"
              onClick={() => handleQuickAction('claim-rewards')}
              disabled={loading === 'claim-rewards'}
            >
              {loading === 'claim-rewards' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              <div className="text-left">
                <div className="font-medium">Claim Rewards</div>
                <div className="text-xs text-muted-foreground">Claim 25 VTNA pending rewards</div>
              </div>
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">Ready</Badge>
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