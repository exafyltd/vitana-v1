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
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { Send } from "lucide-react";
import { CURRENCY_CONFIGS, getCurrencyIcon } from "@/lib/currencies";

interface WalletIntegratedPaymentRequestProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType: string, contentData: any) => Promise<void>;
  recipient?: {
    id: string;
    name: string;
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
  const { toast } = useToast();
  const { balances } = useWallet();

  const handleSendRequest = async () => {
    if (!amount || !description || !recipient) {
      toast({
        title: "Missing Information",
        description: "Please fill in amount and description",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
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

      await onSendMessage(
        `💰 Payment Request: ${currency === 'USD' ? '$' : ''}${amount} ${currency === 'USD' ? '' : currency} - ${description}`,
        'payment_request',
        paymentData
      );

      toast({
        title: "Payment Request Sent! 💸",
        description: `Request for ${paymentData.currency === 'USD' ? '$' + amount : amount + ' ' + paymentData.currency} sent to ${recipient.name}`,
        duration: 5000
      });

      onClose();
      setAmount('');
      setDescription('');
      setDueDate('');
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast({
        title: "Error",
        description: "Failed to send payment request",
        variant: "destructive"
      });
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
            Request Payment
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
                <p className="text-xs text-muted-foreground">Will receive your request</p>
              </div>
            </div>
          )}

          {/* Your Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Current Balance:</span>
                <div className="flex items-center gap-3">
                  {balances.map((balance) => (
                    <span key={balance.currency_type} className="flex items-center gap-1">
                      {getCurrencyIcon(balance.currency_type, "w-3 h-3")}
                      {balance.balance.toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this payment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Due Date (Optional) */}
          <div>
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
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
              {paymentType} Payment Request
            </Badge>
            {currency === 'CREDITS' && (
              <Badge variant="secondary">
                Platform Credits
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest} 
              className="flex-1"
              disabled={isProcessing || !recipient}
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