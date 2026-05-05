import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowUpDown, Loader2 } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { calculateExchange } from '@/lib/exchangeRates';
import { CURRENCY_CONFIGS, getCurrencyIcon } from '@/lib/currencies';
import { isIAPRestricted } from '@/lib/appilix';
import { notifyError } from '@/lib/i18n-toast';

interface ExchangeStepProps {
  onBack: () => void;
  onClose: () => void;
  initialCurrency?: 'USD' | 'VTNA' | 'CREDITS';
}

export function ExchangeStep({ onBack, onClose, initialCurrency }: ExchangeStepProps) {
  // Hide exchange on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const { exchangeCurrency, getBalance } = useWallet();
  const { toast } = useToast();
  
  // Set initial currencies based on the selected currency from the card
  const getInitialFromCurrency = () => {
    if (initialCurrency) return initialCurrency;
    return 'CREDITS';
  };
  
  const getInitialToCurrency = () => {
    if (!initialCurrency) return 'VTNA';
    // If initial currency is set, default to a different currency
    switch (initialCurrency) {
      case 'USD': return 'VTNA';
      case 'VTNA': return 'CREDITS';
      case 'CREDITS': return 'USD';
      default: return 'VTNA';
    }
  };
  
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>(getInitialFromCurrency());
  const [toCurrency, setToCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>(getInitialToCurrency());
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currencies = CURRENCY_CONFIGS;

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleExchange = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      notifyError('toasts.wallet.invalidAmount', 'toasts.wallet.pleaseEnterValidAmount');
      return;
    }

    const exchangeAmount = parseFloat(amount);
    const currentBalance = getBalance(fromCurrency) || 0;

    if (exchangeAmount > currentBalance) {
      notifyError('toasts.wallet.insufficientBalance2');
      return;
    }

    setIsProcessing(true);

    try {
      // Use the correct exchange rate from calculation
      const exchangeRate = calculation?.rate || 1.0;

      await exchangeCurrency(fromCurrency, toCurrency, exchangeAmount, exchangeRate);
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsProcessing(false);
    }
  };

  const calculation = amount ? calculateExchange(parseFloat(amount), fromCurrency, toCurrency) : null;
  const fromBalance = getBalance(fromCurrency) || 0;
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= fromBalance;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <ArrowUpDown className="h-5 w-5 text-primary" />
          Exchange Currency
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* From Currency */}
        <div className="space-y-2">
          <Label htmlFor="from-amount">From</Label>
          <div className="flex gap-2">
            <Input
              id="from-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Select value={fromCurrency} onValueChange={(value: any) => setFromCurrency(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    <div className="flex items-center gap-2">
                      {getCurrencyIcon(currency.value)}
                      {currency.fullLabel}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {fromBalance} {fromCurrency}
          </p>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapCurrencies}
            className="rounded-full h-8 w-8 p-0"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <Label htmlFor="to-currency">To</Label>
          <Select value={toCurrency} onValueChange={(value: any) => setToCurrency(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {currencies.filter(c => c.value !== fromCurrency).map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  <div className="flex items-center gap-2">
                    {getCurrencyIcon(currency.value)}
                    {currency.fullLabel}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exchange Preview */}
        {calculation && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>You'll receive:</span>
                <span className="font-medium">{calculation.toAmount.toFixed(2)} {toCurrency}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Exchange rate:</span>
                <span>1 {fromCurrency} = {calculation.rate} {toCurrency}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>No fees:</span>
                <span>Free exchange</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleExchange}
            disabled={!isValidAmount || isProcessing || fromCurrency === toCurrency}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exchanging...
              </>
            ) : (
              'Exchange'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}