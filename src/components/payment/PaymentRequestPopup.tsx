import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import { CreditCard, Coins, DollarSign, Users, Send } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface PaymentRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
  initialAmount?: string;
  initialDescription?: string;
  paymentType?: 'service' | 'event' | 'transfer';
}

export default function PaymentRequestPopup({ 
  isOpen, 
  onClose, 
  recipient,
  initialAmount = "",
  initialDescription = "",
  paymentType = 'transfer'
}: PaymentRequestPopupProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState('CREDITS');
  const [description, setDescription] = useState(initialDescription);
  const [dueDate, setDueDate] = useState('');
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch

  const handleSendRequest = async () => {
    if (!amount || !description) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
      return;
    }

    try {
      // Create payment request message
      const paymentData = {
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        description,
        dueDate: dueDate || undefined,
        paymentType,
        requestedBy: "current_user", // This would be the actual user
        status: "pending"
      };

      const actionButtons = [
        {
          label: "Accept Payment",
          action: "payment_accept",
          variant: "default"
        },
        {
          label: "Decline",
          action: "payment_decline", 
          variant: "outline"
        }
      ];

      await sendMessage(
        `Payment request for ${currency === 'credits' ? amount + ' credits' : '$' + amount}`,
        recipient?.id,
        'payment_request',
        paymentData,
        undefined,
        actionButtons
      );

      notify('toasts.payment.paymentRequestSent');

      onClose();
      setAmount('');
      setDescription('');
      setDueDate('');
    } catch (error) {
      console.error('Error sending payment request:', error);
      notifyError('toasts.payment.error', 'toasts.payment.failedSendPaymentRequest');
    }
  };

  const getCurrencyIcon = () => {
    switch (currency.toUpperCase()) {
      case 'CREDITS': return <Coins className="w-4 h-4" />;
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'VTNA': return <CreditCard className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {t('screens.payment.sendPaymentRequest')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          {recipient && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src={recipient.avatar} />
                <AvatarFallback>{recipient.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{recipient.name}</p>
                <p className="text-xs text-muted-foreground">{t('screens.payment.requestRecipient')}</p>
              </div>
            </div>
          )}

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
                <SelectContent>
                  <SelectItem value="CREDITS">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      {t('screens.payment.credits')}
                    </div>
                  </SelectItem>
                  <SelectItem value="USD">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {t('screens.payment.usd')}
                    </div>
                  </SelectItem>
                  <SelectItem value="VTNA">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {t('screens.payment.vtna')}
                    </div>
                  </SelectItem>
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
            <Badge variant="outline" className="capitalize">
              {paymentType} Payment
            </Badge>
            {currency.toUpperCase() === 'CREDITS' && (
              <Badge variant="secondary">
                Platform Credits
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.payment.cancel')}
            </Button>
            <Button onClick={handleSendRequest} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              {t('screens.payment.sendRequest')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}