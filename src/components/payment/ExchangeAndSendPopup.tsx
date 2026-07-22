import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import { ArrowRight, ArrowUpDown, Send, Zap, DollarSign, Coins } from "lucide-react";
import { calculateExchange, formatCurrency, getCurrencySymbol } from "@/lib/exchangeRates";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { isIAPRestricted } from "@/lib/appilix";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
interface ExchangeAndSendPopupProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
  initialAmount?: string;
  initialFromCurrency?: string;
  initialToCurrency?: string;
}

export default function ExchangeAndSendPopup({
  isOpen,
  onClose,
  recipient,
  initialAmount = "",
  initialFromCurrency = "USD",
  initialToCurrency = "CREDITS"
}: ExchangeAndSendPopupProps) {
  // Hide exchange-and-send on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const [amount, setAmount] = useState(initialAmount);
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState(initialToCurrency);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false);
  const { logActivity } = useActivityLogger();

  const currencies = [
    { value: 'USD', label: 'US Dollars', icon: DollarSign },
    { value: 'CREDITS', label: 'Credits', icon: Coins }
  ];

  // Mock user balance
  const userBalance = {
    USD: 2847.32,
    CREDITS: 1547
  };

  const getCurrencyIcon = (currency: string) => {
    const currencyData = currencies.find(c => c.value === currency);
    const Icon = currencyData?.icon || Coins;
    return <Icon className="w-4 h-4" />;
  };

  const calculation = calculateExchange(
    parseFloat(amount) || 0,
    fromCurrency,
    toCurrency
  );

  const canAfford = () => {
    const paymentAmount = parseFloat(amount) || 0;
    const normalizedCurrency = fromCurrency.toUpperCase();
    return userBalance[normalizedCurrency as keyof typeof userBalance] >= paymentAmount;
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleExchangeAndSend = async () => {
    if (!amount || !description) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
      return;
    }

    if (!canAfford()) {
      notifyError('toasts.payment.insufficientBalance');
      return;
    }

    if (!calculation) {
      notifyError('toasts.payment.exchangeError', 'toasts.payment.unableCalculateExchangeRate');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate exchange + send process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const exchangeData = {
        originalAmount: calculation.fromAmount,
        originalCurrency: fromCurrency.toUpperCase(),
        exchangedAmount: calculation.total,
        exchangedCurrency: toCurrency.toUpperCase(),
        exchangeRate: calculation.rate,
        fees: calculation.fees,
        description,
        recipient: recipient?.name || "Recipient",
        transactionId: `EXS_${Date.now()}`,
        type: "exchange_and_send"
      };

      // Log exchange activity
      await logActivity({
        activityType: 'wallet.exchange',
        activityData: {
          from_amount: calculation.fromAmount,
          from_currency: fromCurrency.toUpperCase(),
          to_amount: calculation.total,
          to_currency: toCurrency.toUpperCase(),
          exchange_rate: calculation.rate,
          fees: calculation.fees,
        },
        dedupeKey: `wallet-exchange-${Date.now()}`,
      });

      await sendMessage(
        `💱➡️ Exchange & Send: ${formatCurrency(calculation.fromAmount, fromCurrency)} → ${formatCurrency(calculation.total, toCurrency)} - ${description}`,
        recipient?.id,
        'exchange_and_send',
        exchangeData
      );

      notify('toasts.payment.exchangeSendCompleted');

      onClose();
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Exchange and send error:', error);
      notifyError('toasts.payment.transactionFailed', 'toasts.payment.pleaseTryAgainContactSupport');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            {t('screens.payment.exchangeSend')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          {recipient && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={recipient.avatar} />
                <AvatarFallback>{recipient.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">{t('screens.payment.recipient')}</p>
              </div>
            </div>
          )}

          {/* Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('screens.payment.yourBalance2')}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {fmtNumber(userBalance.USD)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {userBalance.CREDITS}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">{t('screens.payment.amount')}</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Currency Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('screens.payment.youSend2')}</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
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

            <div>
              <Label>{t('screens.payment.theyReceive')}</Label>
              <div className="flex gap-1">
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter(c => c.value !== fromCurrency).map(currency => (
                      <SelectItem key={currency.value} value={currency.value}>
                        <div className="flex items-center gap-2">
                          {getCurrencyIcon(currency.value)}
                          {currency.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleSwapCurrencies}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Exchange Preview */}
          {calculation && parseFloat(amount) > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3 text-sm mb-3">
                  <div className="text-center">
                    <p className="text-muted-foreground">{t('screens.payment.youSend')}</p>
                    <p className="font-bold text-purple-600">
                      {formatCurrency(calculation.fromAmount, fromCurrency)}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-500" />
                  <div className="text-center">
                    <p className="text-muted-foreground">{t('screens.payment.theyReceive2')}</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(calculation.total, toCurrency)}
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-center text-muted-foreground">{t('screens.payment.rate1FromcurrencyValue1TocurrencyFee', { fromCurrency, value1: calculation.rate.toFixed(3), toCurrency, value3: formatCurrency(calculation.fees, fromCurrency) })}</div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">{t('screens.payment.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('screens.payment.whatThisPaymentFor')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleExchangeAndSend} 
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={!canAfford() || !calculation || parseFloat(amount) <= 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{t('screens.payment.processing')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('screens.payment.exchangeSend')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}