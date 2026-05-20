import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

import { useWallet } from "@/hooks/useWallet";
import { Send } from "lucide-react";
import { CURRENCY_CONFIGS, getCurrencyIcon } from "@/lib/currencies";
import { t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
interface WalletIntegratedPaymentRequestProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType: string, contentData: any) => Promise<void>;
  recipient?: {
    id: string;
    name?: string;
    avatar?: string;
  };
  initialAmount?: string;
  initialDescription?: string;
  paymentType?: 'service' | 'event' | 'transfer';
}

export default function WalletIntegratedPaymentRequest({ 
  isOpen, 
  onClose, 
  onSendMessage,
  recipient,
  initialAmount = "",
  initialDescription = "",
  paymentType = 'transfer'
}: WalletIntegratedPaymentRequestProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState('CREDITS');
  const [description, setDescription] = useState(initialDescription);
  const [dueDate, setDueDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { balances } = useWallet();
  
  // Use preloaded recipient data directly - no loading needed
  const effectiveRecipient = recipient ? {
    ...recipient,
    name: recipient.name || 'Recipient'
  } : null;

  const handleSendRequest = async () => {
    if (!amount || !description || !recipient) {
      return;
    }

    // Construct payment data
    const paymentData = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      description,
      dueDate: dueDate || undefined,
      paymentType,
      requestedBy: "current_user",
      recipientId: recipient.id,
      status: "pending",
      transactionId: `REQ_${Date.now()}`
    };

    // Reset form and close immediately
    const amountStr = amount;
    const currencyStr = currency;
    const descriptionStr = description;
    setAmount('');
    setDescription('');
    setDueDate('');
    onClose();

    // Send message in background (fire-and-forget)
    onSendMessage(
      `💰 Payment Request: ${currencyStr === 'USD' ? '$' : ''}${amountStr} ${currencyStr === 'USD' ? '' : currencyStr} - ${descriptionStr}`,
      'payment_request',
      paymentData
    ).catch((error) => {
      console.error('Error sending payment request:', error);
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {t('screens.payment.requestPayment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          {effectiveRecipient && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src={effectiveRecipient.avatar} />
                <AvatarFallback>
                  {effectiveRecipient.name ? effectiveRecipient.name[0]?.toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {effectiveRecipient.name}
                </p>
                <p className="text-xs text-muted-foreground">{t('screens.payment.willReceiveYourRequest')}</p>
              </div>
            </div>
          )}

          {/* Your Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('screens.payment.yourCurrentBalance')}</span>
                <div className="flex items-center gap-3">
                  {balances.map((balance) => (
                    <span key={balance.currency_type} className="flex items-center gap-1">
                      {getCurrencyIcon(balance.currency_type, "w-3 h-3")}
                      {fmtNumber(balance.balance)}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label htmlFor="currency">{t('screens.payment.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {CURRENCY_CONFIGS.map(currency => (
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

          {/* Due Date (Optional) */}
          <div>
            <Label htmlFor="dueDate">{t('screens.payment.dueDateOptional')}</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Payment Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{t('screens.payment.paymenttypePaymentRequest', { paymentType })}
            </Badge>
            {currency === 'CREDITS' && (
              <Badge variant="secondary">{t('screens.payment.platformCredits')}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleSendRequest} 
              className="flex-1"
              disabled={!effectiveRecipient}
            >
              <Send className="w-4 h-4 mr-2" />
              {t('screens.payment.sendRequest')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}