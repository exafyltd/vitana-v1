import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowRight, Zap } from 'lucide-react';
import { calculateExchange, formatCurrency, getCurrencySymbol } from '@/lib/exchangeRates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CURRENCY_CONFIGS, getCurrencyIcon } from '@/lib/currencies';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface QuickExchangeWidgetProps {
  onExchange?: (fromAmount: number, fromCurrency: string, toCurrency: string, toAmount: number) => void;
  onExchangeAndSend?: (fromAmount: number, fromCurrency: string, toCurrency: string, toAmount: number) => void;
  className?: string;
}

export function QuickExchangeWidget({
  onExchange,
  onExchangeAndSend,
  className
}: QuickExchangeWidgetProps) {
  // Hide exchange widget on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const [fromAmount, setFromAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('VTNA');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const currencies = CURRENCY_CONFIGS;

  const calculation = calculateExchange(
    parseFloat(fromAmount) || 0,
    fromCurrency,
    toCurrency
  );

  const quickAmounts = fromCurrency === 'USD' ? [25, 50, 100, 200] : [100, 250, 500, 1000];

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount('');
  };

  const handleExchange = async () => {
    if (!calculation || parseFloat(fromAmount) <= 0) {
      notifyError('toasts.wallet.invalidAmount', 'toasts.wallet.pleaseEnterValidAmountExchange');
      return;
    }

    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      notify('toasts.wallet.exchangeCompleted');

      onExchange?.(calculation.fromAmount, fromCurrency, toCurrency, calculation.total);
      setFromAmount('');
    } catch (error) {
      notifyError('toasts.wallet.exchangeFailed', 'toasts.wallet.pleaseTryAgainContactSupport');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExchangeAndSend = async () => {
    if (!calculation) return;
    
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onExchangeAndSend?.(calculation.fromAmount, fromCurrency, toCurrency, calculation.total);
      setFromAmount('');
    } catch (error) {
      notifyError('toasts.wallet.actionFailed', 'toasts.wallet.pleaseTryAgain');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={cn("bg-gradient-to-br from-blue-50/30 to-purple-50/30 border border-blue-200/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5 text-blue-600" />
          {t('screens.wallet.quickExchange')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Amount Buttons */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">{t('screens.wallet.quickAmounts')}</Label>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setFromAmount(amount.toString())}
              >
                {getCurrencySymbol(fromCurrency)} {amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Exchange Form */}
        <div className="grid grid-cols-2 gap-3">
          {/* From Currency */}
          <div className="space-y-2">
            <Label htmlFor="from-amount">{t('screens.wallet.from')}</Label>
            <div className="space-y-2">
              <Input
                id="from-amount"
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
              />
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {currencies.map(currency => (
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
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label htmlFor="to-amount">{t('screens.wallet.text')}</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="to-amount"
                  type="text"
                  value={calculation ? calculation.total.toFixed(2) : '0'}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={handleSwapCurrencies}
                >
                  <ArrowUpDown className="w-3 h-3" />
                </Button>
              </div>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {currencies.filter(c => c.value !== fromCurrency).map(currency => (
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
          </div>
        </div>

        {/* Exchange Preview */}
        {calculation && parseFloat(fromAmount) > 0 && (
          <Card className="bg-white/50 border border-blue-200/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">{t('screens.wallet.youSend')}</p>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(calculation.fromAmount, fromCurrency)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500" />
                <div className="text-center">
                  <p className="text-muted-foreground">{t('screens.wallet.youReceive')}</p>
                  <p className="font-bold text-green-600">
                    {formatCurrency(calculation.total, toCurrency)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Rate: 1 {fromCurrency} = {calculation.rate.toFixed(3)} {toCurrency}</span>
                <span>{t('screens.wallet.noFeesFreeExchange')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleExchange}
            disabled={!calculation || parseFloat(fromAmount) <= 0 || isProcessing}
            variant="outline"
          >
            {isProcessing ? 'Processing...' : 'Exchange'}
          </Button>
          
          <Button 
            onClick={handleExchangeAndSend}
            disabled={!calculation || parseFloat(fromAmount) <= 0 || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Zap className="w-4 h-4 mr-1" />
            {t('screens.wallet.exchangeSend')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}