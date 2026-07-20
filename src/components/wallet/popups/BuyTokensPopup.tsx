import React, { useState } from 'react';
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coins, TrendingUp, Loader2, Star, Zap } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { getExchangeRate } from '@/lib/exchangeRates';
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
interface BuyTokensPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyTokensPopup({ open, onOpenChange }: BuyTokensPopupProps) {
  const { getBalance, updateBalance, exchangeCurrency } = useWallet();
  const { toast } = useToast();
  const [tokenAmount, setTokenAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (isIAPRestricted()) return null;

  const currentTokens = getBalance('VTNA') || 0;
  const usdBalance = getBalance('USD') || 0;

  // Get actual exchange rate: 1 USD = 100 VTNA, so 1 VTNA = $0.01
  const exchangeRate = getExchangeRate('VTNA', 'USD');
  const vtnPriceInUSD = exchangeRate?.rate || 0.01; // Fallback to $0.01 per VTNA
  const usdToVtnaRate = getExchangeRate('USD', 'VTNA')?.rate || 100;
  
  // VTNA token packages with correct market rate
  const tokenPackages = [
    { tokens: 100, cost: Math.round(100 * vtnPriceInUSD), bonus: 0, popular: false },
    { tokens: 500, cost: Math.round(500 * vtnPriceInUSD), bonus: 50, popular: true },
    { tokens: 1000, cost: Math.round(1000 * vtnPriceInUSD), bonus: 150, popular: false },
    { tokens: 2500, cost: Math.round(2500 * vtnPriceInUSD), bonus: 500, popular: false }
  ];

  const handleBuyTokens = async (tokens: number, cost: number, bonus: number) => {
    if (cost > usdBalance) {
      notifyError('toasts.wallet.insufficientUsdBalance', 'toasts.wallet.youDonTHaveEnoughUsd2');
      return;
    }

    setLoading(true);

    try {
      // Atomic USD -> VTNA exchange for the paid amount; bonus is a separate
      // reward credit (not paid for), same reasoning as BuyCreditsPopup.
      await exchangeCurrency('USD', 'VTNA', cost, usdToVtnaRate);
      if (bonus > 0) {
        await updateBalance('VTNA', bonus, 'add', 'reward', 'Bonus VTNA from package purchase');
      }

      notify('toasts.wallet.vtnaTokensPurchasedSuccessfully');

      onOpenChange(false);
    } catch (error) {
      notifyError('toasts.wallet.purchaseFailed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPurchase = async () => {
    if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidNumberTokens');
      return;
    }

    const tokens = parseFloat(tokenAmount);
    const cost = Math.round(tokens * vtnPriceInUSD * 100) / 100; // Use actual exchange rate
    
    if (cost > usdBalance) {
      notifyError('toasts.wallet.insufficientUsdBalance', 'toasts.wallet.youDonTHaveEnoughUsd2');
      return;
    }

    setLoading(true);

    try {
      await exchangeCurrency('USD', 'VTNA', cost, usdToVtnaRate);

      notify('toasts.wallet.vtnaTokensPurchasedSuccessfully');

      onOpenChange(false);
      setTokenAmount('');
    } catch (error) {
      notifyError('toasts.wallet.purchaseFailed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md" fullscreenOnMobile>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            {t('screens.wallet.buyVtnaTokens')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
              <div className="text-xs text-muted-foreground">{t('screens.wallet.currentVtna')}</div>
              <div className="font-semibold text-purple-700">{fmtNumber(currentTokens)}</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="text-xs text-muted-foreground">{t('screens.wallet.usdBalance')}</div>
              <div className="font-semibold text-green-700">${fmtNumber(usdBalance)}</div>
            </div>
          </div>

          {/* Token Packages */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t('screens.wallet.vtnaTokenPackages')}</h4>
            {tokenPackages.map((pkg, index) => (
              <Button
                key={index}
                variant="outline"
                className={`justify-between h-auto p-4 w-full ${pkg.popular ? 'border-purple-200 bg-purple-50/50' : ''}`}
                onClick={() => handleBuyTokens(pkg.tokens, pkg.cost, pkg.bonus)}
                disabled={loading || pkg.cost > usdBalance}
              >
                <div className="flex items-center gap-3">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="h-4 w-4 text-purple-600" />
                  )}
              <div className="text-left">
                <div className="font-medium">{t('screens.wallet.value0Vtna', { value0: fmtNumber(pkg.tokens) })}
                  {pkg.bonus > 0 && (
                    <span className="text-green-600 ml-1">{t('screens.wallet.bonusBonus', { bonus: pkg.bonus })}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">${pkg.cost}</div>
              </div>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.bonus > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{pkg.bonus}
                    </Badge>
                  )}
                  {pkg.popular && (
                    <Badge className="bg-purple-600 text-white flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {t('screens.wallet.popular')}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>

          <Separator />

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="tokenAmount">{t('screens.wallet.customAmount')}</Label>
            <Input
              id="tokenAmount"
              type="number"
              placeholder={t('screens.wallet.enterNumberVtnaTokens')}
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              min="1"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('screens.wallet.rateValue0PerVtna', { value0: vtnPriceInUSD.toFixed(2) })}</span>
              {tokenAmount && (
                <span>{t('screens.wallet.costValue0', { value0: (parseFloat(tokenAmount) * vtnPriceInUSD).toFixed(2) })}</span>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCustomPurchase}
              disabled={loading || !tokenAmount}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}{t('screens.wallet.buyCustomAmount')}
            </Button>
          </div>

          {/* Token Benefits Info */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">{t('screens.wallet.vtnaTokenBenefits')}</span>
            </div>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>{t('screens.wallet.stakeForPassiveIncomeRewards')}</li>
              <li>{t('screens.wallet.governanceVotingRightsPlatformDecisions')}</li>
              <li>{t('screens.wallet.accessExclusiveVtnaHolderFeatures')}</li>
              <li>{t('screens.wallet.potentialValueAppreciationOverTime')}</li>
            </ul>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}