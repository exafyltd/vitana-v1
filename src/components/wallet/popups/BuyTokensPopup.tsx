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
import { Coins, TrendingUp, Loader2, Star, Zap } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { getExchangeRate } from '@/lib/exchangeRates';
import { notify, notifyError } from '@/lib/i18n-toast';

interface BuyTokensPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyTokensPopup({ open, onOpenChange }: BuyTokensPopupProps) {
  const { getBalance, updateBalance } = useWallet();
  const { toast } = useToast();
  const [tokenAmount, setTokenAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (isIAPRestricted()) return null;

  const currentTokens = getBalance('VTNA') || 0;
  const usdBalance = getBalance('USD') || 0;
  
  // Get actual exchange rate: 1 USD = 100 VTNA, so 1 VTNA = $0.01
  const exchangeRate = getExchangeRate('VTNA', 'USD');
  const vtnPriceInUSD = exchangeRate?.rate || 0.01; // Fallback to $0.01 per VTNA
  
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
      // Deduct USD and add VTNA tokens (including bonus)
      await updateBalance('USD', cost, 'subtract');
      await updateBalance('VTNA', tokens + bonus, 'add');
      
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
      await updateBalance('USD', cost, 'subtract');
      await updateBalance('VTNA', tokens, 'add');
      
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            Buy VTNA Tokens
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
              <div className="text-xs text-muted-foreground">Current VTNA</div>
              <div className="font-semibold text-purple-700">{currentTokens.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="text-xs text-muted-foreground">USD Balance</div>
              <div className="font-semibold text-green-700">${usdBalance.toLocaleString()}</div>
            </div>
          </div>

          {/* Token Packages */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">VTNA Token Packages</h4>
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
                <div className="font-medium">
                  {pkg.tokens.toLocaleString()} VTNA
                  {pkg.bonus > 0 && (
                    <span className="text-green-600 ml-1">+ {pkg.bonus} Bonus</span>
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
                      Popular
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>

          <Separator />

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="tokenAmount">Custom Amount</Label>
            <Input
              id="tokenAmount"
              type="number"
              placeholder="Enter number of VTNA tokens"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              min="1"
              step="0.1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rate: ${vtnPriceInUSD.toFixed(2)} per VTNA</span>
              {tokenAmount && (
                <span>Cost: ${(parseFloat(tokenAmount) * vtnPriceInUSD).toFixed(2)}</span>
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
              )}
              Buy Custom Amount
            </Button>
          </div>

          {/* Token Benefits Info */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">VTNA Token Benefits</span>
            </div>
            <ul className="text-xs text-purple-600 space-y-1">
              <li>• Stake for passive income rewards</li>
              <li>• Governance voting rights on platform decisions</li>
              <li>• Access to exclusive VTNA holder features</li>
              <li>• Potential value appreciation over time</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}