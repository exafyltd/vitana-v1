import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Euro, Loader2, Shield } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useCreateDeposit } from '@/hooks/useWalletGateway';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useEurUsdRate } from '@/hooks/useEurUsdRate';
import { convertFromUsd, convertToUsd, getCurrencySymbol } from '@/lib/exchangeRates';
import { toMinorUnits } from '@/lib/format-money';

import { fmtNumber } from '@/lib/locale-format';
interface AddFundsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFundsPopup({ open, onOpenChange }: AddFundsPopupProps) {
  const { getBalance } = useWallet();
  const { displayCurrency } = useDisplayCurrency();
  const { eurPerUsd } = useEurUsdRate();
  const { createDeposit, isCreating } = useCreateDeposit();
  const [fundAmount, setFundAmount] = useState('');

  if (isIAPRestricted()) return null;

  // Balances are stored in USD; present everything in the user's chosen
  // display currency and convert the entered amount back to USD on submit.
  const symbol = getCurrencySymbol(displayCurrency);
  const currentBalance = convertFromUsd(getBalance('USD') || 0, displayCurrency, eurPerUsd);
  const CurrencyIcon = displayCurrency === 'EUR' ? Euro : DollarSign;
  const quickAmounts = [25, 50, 100, 200, 500];

  const handleContinue = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidAmountAdd');
      return;
    }

    try {
      // The wallet balance is stored in USD regardless of display currency, so
      // the real Stripe deposit is always created in USD; the browser is then
      // redirected to Stripe Checkout by useCreateDeposit on success.
      const usdAmount = convertToUsd(parseFloat(fundAmount), displayCurrency, eurPerUsd);
      notify('toasts.wallet.redirectingToCheckout');
      await createDeposit({ amount_minor: toMinorUnits(usdAmount), currency: 'USD' });
    } catch (error) {
      notifyError('toasts.wallet.transactionFailed');
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md" fullscreenOnMobile>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <CurrencyIcon className="h-5 w-5 text-green-600" />
            {t('screens.wallet.addFundsBalance', { currency: displayCurrency })}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          {/* Current Balance */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('screens.wallet.currentBalanceLabel', { currency: displayCurrency })}</span>
              <span className="font-semibold text-green-700">{symbol}{fmtNumber(currentBalance, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="fundAmount">{t('screens.wallet.amountAddCurrency', { currency: displayCurrency })}</Label>
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
                  {symbol}{amount}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <Button
            className="w-full h-12"
            onClick={handleContinue}
            disabled={isCreating || !fundAmount}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('screens.wallet.processing')}
              </>
            ) : (
              t('screens.wallet.continueToSecureCheckout')
            )}
          </Button>

          {/* Security Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{t('screens.wallet.secureTransaction')}</span>
            </div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>{t('screens.wallet.cardPaymentViaStripe')}</li>
              <li>{t('screens.wallet.text256bitSslEncryption')}</li>
              <li>{t('screens.wallet.pciDssCompliantProcessing')}</li>
            </ul>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
