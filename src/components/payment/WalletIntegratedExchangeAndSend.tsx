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
import { useWallet } from "@/hooks/useWallet";
import { ArrowRight, ArrowUpDown, Send, Zap } from "lucide-react";
import { calculateExchange, formatCurrency } from "@/lib/exchangeRates";
import { CURRENCY_CONFIGS, getCurrencyIcon } from "@/lib/currencies";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface WalletIntegratedExchangeAndSendProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType: string, contentData: any) => Promise<void>;
  recipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
  initialAmount?: string;
  initialFromCurrency?: string;
  initialToCurrency?: string;
}

export default function WalletIntegratedExchangeAndSend({ 
  isOpen, 
  onClose, 
  onSendMessage,
  recipient,
  initialAmount = "",
  initialFromCurrency = "USD",
  initialToCurrency = "VTNA"
}: WalletIntegratedExchangeAndSendProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState(initialToCurrency);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { balances, exchangeCurrency, getBalance } = useWallet();

  const currencies = CURRENCY_CONFIGS;

  const calculation = calculateExchange(
    parseFloat(amount) || 0,
    fromCurrency,
    toCurrency
  );

  const canAfford = () => {
    const paymentAmount = parseFloat(amount) || 0;
    return (getBalance(fromCurrency as "USD" | "VTNA" | "CREDITS") || 0) >= paymentAmount;
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleExchangeAndSend = async () => {
    if (!amount || !description || !recipient) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAllRequiredFields');
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
      // Use server-side calculated amounts for accuracy
      const exchangeData = {
        originalAmount: parseFloat(amount),
        originalCurrency: fromCurrency,
        exchangedAmount: calculation.total, // This is the net amount after fees
        exchangedCurrency: toCurrency,
        exchangeRate: calculation.rate,
        fees: calculation.fees,
        description,
        recipient: recipient.name,
        recipientId: recipient.id,
        transactionId: `EXS_${Date.now()}`,
        type: "exchange_and_send",
        status: "pending"
      };

      await onSendMessage(
        `💱➡️ Exchange & Send Request: Convert ${formatCurrency(parseFloat(amount), fromCurrency)} to ${formatCurrency(calculation.total, toCurrency)} and send to you - ${description}`,
        'exchange_and_send',
        exchangeData
      );

      notify('toasts.payment.exchangeSendRequestSent');

      onClose();
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Exchange and send error:', error);
      notifyError('toasts.payment.requestFailed', 'toasts.payment.pleaseTryAgainContactSupport');
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
            Exchange & Send Request
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
                <p className="text-sm text-muted-foreground">{t('screens.payment.willReceiveExchangedAmount')}</p>
              </div>
            </div>
          )}

          {/* Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('screens.payment.yourBalance2')}</span>
                <div className="flex items-center gap-3">
                  {balances.map((balance) => (
                    <span key={balance.currency_type} className="flex items-center gap-1">
                      {getCurrencyIcon(balance.currency_type)}
                      {balance.balance.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">{t('screens.payment.amountExchange')}</Label>
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
              <Label>{t('screens.payment.fromCurrency')}</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger>
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

            <div>
              <Label>{t('screens.payment.currency')}</Label>
              <div className="flex gap-1">
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="flex-1">
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
                    <p className="text-muted-foreground">{t('screens.payment.youExchange')}</p>
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
                
                <div className="text-xs text-center text-muted-foreground">
                  Rate: 1 {fromCurrency} = {calculation.rate.toFixed(3)} {toCurrency} • Fee: {formatCurrency(calculation.fees, fromCurrency)}
                </div>
                
                {fromCurrency === 'VTNA' && toCurrency === 'CREDITS' && (
                  <Badge variant="secondary" className="w-full mt-2 bg-green-100 text-green-700">
                    🎉 +5% Bonus Applied
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="description">Message</Label>
            <Textarea
              id="description"
              placeholder={t('screens.payment.whatThisExchangeFor')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleExchangeAndSend} 
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={!canAfford() || !calculation || parseFloat(amount) <= 0 || isProcessing || !recipient}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}