import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CreditCard, Banknote, Loader2, Shield } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface AddFundsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFundsPopup({ open, onOpenChange }: AddFundsPopupProps) {
  const { getBalance, updateBalance } = useWallet();
  const { toast } = useToast();
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (isIAPRestricted()) return null;

  const currentBalance = getBalance('USD') || 0;
  const quickAmounts = [25, 50, 100, 200, 500];
  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, fee: '2.9%' },
    { id: 'bank', name: 'Bank Transfer', icon: Banknote, fee: 'Free' },
    { id: 'paypal', name: 'PayPal', icon: DollarSign, fee: '3.4%' }
  ];

  const handleAddFunds = async (paymentMethod: string) => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidAmountAdd');
      return;
    }

    setLoading(true);
    
    try {
      await updateBalance('USD', parseFloat(fundAmount), 'add');
      
      notify('toasts.wallet.fundsAddedSuccessfully');
      
      onOpenChange(false);
      setFundAmount('');
    } catch (error) {
      notifyError('toasts.wallet.transactionFailed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('screens.wallet.addFundsUsdBalance')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Balance */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('screens.wallet.currentUsdBalance')}</span>
              <span className="font-semibold text-green-700">${currentBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="fundAmount">{t('screens.wallet.amountAddUsd')}</Label>
            <Input
              id="fundAmount"
              type="number"
              placeholder={t('screens.wallet.enterAmount')}
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              min="1"
            />
            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setFundAmount(amount.toString())}
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Payment Methods */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t('screens.wallet.choosePaymentMethod')}</h4>
            {paymentMethods.map((method) => (
              <Button
                key={method.id}
                variant="outline"
                className="justify-between h-auto p-4 w-full"
                onClick={() => handleAddFunds(method.id)}
                disabled={loading || !fundAmount}
              >
                <div className="flex items-center gap-3">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <method.icon className="h-4 w-4 text-green-600" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{method.name}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.wallet.processingFeeFee', { fee: method.fee })}</div>
                  </div>
                </div>
                {method.fee === 'Free' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Recommended
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Security Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{t('screens.wallet.secureTransaction')}</span>
            </div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>{t('screens.wallet.text256bitSslEncryption')}</li>
              <li>{t('screens.wallet.pciDssCompliantProcessing')}</li>
              <li>{t('screens.wallet.instantAvailabilityAfterConfirmation')}</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}