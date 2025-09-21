import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowUpDown, Loader2, DollarSign, Coins, CreditCard } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { calculateExchange } from '@/lib/exchangeRates';

interface ExchangeStepProps {
  onBack: () => void;
  onClose: () => void;
}

export function ExchangeStep({ onBack, onClose }: ExchangeStepProps) {
  const { exchangeCurrency, getBalance } = useWallet();
  const { toast } = useToast();
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'VTN' | 'CREDITS'>('CREDITS');
  const [toCurrency, setToCurrency] = useState<'USD' | 'VTN' | 'CREDITS'>('VTN');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currencies = [
    { value: 'CREDITS', label: 'Credits', icon: CreditCard },
    { value: 'VTN', label: 'VTN Tokens', icon: Coins },
    { value: 'USD', label: 'USD', icon: DollarSign }
  ];

  const getCurrencyIcon = (currency: string) => {
    const currencyData = currencies.find(c => c.value === currency);
    if (!currencyData) return null;
    const Icon = currencyData.icon;
    return <Icon className="h-4 w-4" />;
  };

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleExchange = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }

    const exchangeAmount = parseFloat(amount);
    const currentBalance = getBalance(fromCurrency);

    if (exchangeAmount > currentBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${currentBalance} ${fromCurrency}`,
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get exchange rate (simplified for demo)
      const exchangeRate = fromCurrency === 'CREDITS' && toCurrency === 'VTN' ? 0.5 : 
                          fromCurrency === 'VTN' && toCurrency === 'CREDITS' ? 2.0 :
                          fromCurrency === 'USD' && toCurrency === 'VTN' ? 2.5 :
                          fromCurrency === 'VTN' && toCurrency === 'USD' ? 0.4 : 1.0;

      await exchangeCurrency(fromCurrency, toCurrency, exchangeAmount, exchangeRate);
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsProcessing(false);
    }
  };

  const calculation = amount ? calculateExchange(parseFloat(amount), fromCurrency, toCurrency) : null;
  const fromBalance = getBalance(fromCurrency);
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
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    <div className="flex items-center gap-2">
                      {getCurrencyIcon(currency.value)}
                      {currency.label}
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
            <SelectContent>
              {currencies.filter(c => c.value !== fromCurrency).map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  <div className="flex items-center gap-2">
                    {getCurrencyIcon(currency.value)}
                    {currency.label}
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
                <span>Fee (1%):</span>
                <span>{calculation.fees.toFixed(2)} {fromCurrency}</span>
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