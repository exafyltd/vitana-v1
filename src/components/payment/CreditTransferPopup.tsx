import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import { 
  Send, 
  Coins, 
  Users, 
  ArrowRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface CreditTransferPopupProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
  currentBalance?: number;
}

export default function CreditTransferPopup({ 
  isOpen, 
  onClose, 
  recipient,
  currentBalance = 2450
}: CreditTransferPopupProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch

  const transferAmount = parseFloat(amount) || 0;
  const canTransfer = transferAmount > 0 && transferAmount <= currentBalance;
  const remainingBalance = currentBalance - transferAmount;

  const quickAmounts = [50, 100, 250, 500];

  const handleTransfer = async () => {
    if (!canTransfer) {
      notifyError('toasts.payment.invalidTransfer', 'toasts.payment.pleaseEnterValidAmountWithinYour');
      return;
    }

    setIsProcessing(true);

    try {
      // Process the transfer
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Send confirmation message
      const transferData = {
        amount: transferAmount,
        from: "Current User",
        to: recipient?.name || "Recipient",
        note: note || "Credit transfer",
        timestamp: new Date().toISOString(),
        transactionId: `TXN_${Date.now()}`
      };

      await sendMessage(
        `Credit transfer: ${transferAmount} credits ${note ? '- ' + note : ''}`,
        recipient?.id,
        'credit_transfer',
        transferData
      );

      notify('toasts.payment.transferCompleted');

      onClose();
      setAmount('');
      setNote('');
    } catch (error) {
      console.error('Transfer error:', error);
      notifyError('toasts.payment.transferFailed', 'toasts.payment.pleaseTryAgainContactSupport');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {t('screens.payment.transferCredits')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Balance */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">{t('screens.payment.yourBalance')}</span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {currentBalance.toLocaleString()} credits
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recipient */}
          {recipient && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={recipient.avatar} />
                <AvatarFallback>{recipient.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">{t('screens.payment.transferRecipient')}</p>
              </div>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm font-medium">{t('screens.payment.quickAmounts')}</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setAmount(quickAmount.toString())}
                  disabled={quickAmount > currentBalance}
                >
                  {quickAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">{t('screens.payment.transferAmount')}</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t('screens.payment.credits2')}
              </div>
            </div>
            {transferAmount > 0 && (
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-muted-foreground">
                  Remaining: {remainingBalance.toLocaleString()} credits
                </span>
                {!canTransfer && transferAmount > currentBalance && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('screens.payment.insufficientBalance')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note">{t('screens.payment.noteOptional')}</Label>
            <Textarea
              id="note"
              placeholder={t('screens.payment.addNoteForThisTransfer')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Transfer Preview */}
          {transferAmount > 0 && canTransfer && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{t('screens.payment.youSend')}</p>
                    <p className="text-green-600 font-bold">{transferAmount} credits</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-green-600" />
                  <div className="text-center">
                    <p className="font-medium">{recipient?.name || 'Recipient'}</p>
                    <p className="text-green-600 font-bold">receives {transferAmount} credits</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={!canTransfer || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Coins className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('screens.payment.sendCredits')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}