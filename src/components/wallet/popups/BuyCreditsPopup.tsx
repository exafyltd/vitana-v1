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
import { CreditCard, Gift, Zap, Loader2, Star } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface BuyCreditsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyCreditsPopup({ open, onOpenChange }: BuyCreditsPopupProps) {
  const { getBalance, updateBalance } = useWallet();
  const { toast } = useToast();
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (isIAPRestricted()) return null;

  const currentCredits = getBalance('CREDITS') || 0;
  const usdBalance = getBalance('USD') || 0;
  
  const creditPackages = [
    { credits: 100, cost: 25, bonus: 0, popular: false },
    { credits: 250, cost: 50, bonus: 25, popular: true },
    { credits: 500, cost: 90, bonus: 75, popular: false },
    { credits: 1000, cost: 150, bonus: 200, popular: false }
  ];

  const handleBuyCredits = async (credits: number, cost: number, bonus: number) => {
    if (cost > usdBalance) {
      notifyError('toasts.wallet.insufficientUsdBalance', 'toasts.wallet.youDonTHaveEnoughUsd');
      return;
    }

    setLoading(true);
    
    try {
      // Deduct USD and add credits (including bonus)
      await updateBalance('USD', cost, 'subtract');
      await updateBalance('CREDITS', credits + bonus, 'add');
      
      notify('toasts.wallet.creditsPurchasedSuccessfully');
      
      onOpenChange(false);
    } catch (error) {
      notifyError('toasts.wallet.purchaseFailed');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPurchase = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidNumberCredits');
      return;
    }

    const credits = parseFloat(creditAmount);
    const cost = Math.round(credits * 0.25); // $0.25 per credit
    
    if (cost > usdBalance) {
      notifyError('toasts.wallet.insufficientUsdBalance', 'toasts.wallet.youDonTHaveEnoughUsd');
      return;
    }

    setLoading(true);
    
    try {
      await updateBalance('USD', cost, 'subtract');
      await updateBalance('CREDITS', credits, 'add');
      
      notify('toasts.wallet.creditsPurchasedSuccessfully');
      
      onOpenChange(false);
      setCreditAmount('');
    } catch (error) {
      notifyError('toasts.wallet.purchaseFailed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            {t('screens.wallet.buyCredits')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="text-xs text-muted-foreground">{t('screens.wallet.currentCredits')}</div>
              <div className="font-semibold text-blue-700">{currentCredits.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="text-xs text-muted-foreground">{t('screens.wallet.usdBalance')}</div>
              <div className="font-semibold text-green-700">${usdBalance.toLocaleString()}</div>
            </div>
          </div>

          {/* Credit Packages */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{t('screens.wallet.creditPackages')}</h4>
            {creditPackages.map((pkg, index) => (
              <Button
                key={index}
                variant="outline"
                className={`justify-between h-auto p-4 w-full ${pkg.popular ? 'border-blue-200 bg-blue-50/50' : ''}`}
                onClick={() => handleBuyCredits(pkg.credits, pkg.cost, pkg.bonus)}
                disabled={loading || pkg.cost > usdBalance}
              >
                <div className="flex items-center gap-3">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{t('screens.wallet.value0Credits', { value0: pkg.credits.toLocaleString() })}
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
                      <Gift className="h-3 w-3" />
                      +{pkg.bonus}
                    </Badge>
                  )}
                  {pkg.popular && (
                    <Badge className="bg-blue-600 text-white flex items-center gap-1">
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
            <Label htmlFor="creditAmount">{t('screens.wallet.customAmount')}</Label>
            <Input
              id="creditAmount"
              type="number"
              placeholder={t('screens.wallet.enterNumberCredits')}
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              min="1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('screens.wallet.rate025PerCredit')}</span>
              {creditAmount && (
                <span>{t('screens.wallet.costValue0', { value0: (parseFloat(creditAmount) * 0.25).toFixed(2) })}</span>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCustomPurchase}
              disabled={loading || !creditAmount}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}{t('screens.wallet.buyCustomAmount')}
            </Button>
          </div>

          {/* Usage Info */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">{t('screens.wallet.creditUsage')}</span>
            </div>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>{t('screens.wallet.accessPremiumFeaturesServices')}</li>
              <li>{t('screens.wallet.purchaseInappItemsUpgrades')}</li>
              <li>{t('screens.wallet.participateExclusiveEvents')}</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}