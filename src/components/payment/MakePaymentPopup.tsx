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
import { useMessages } from "@/hooks/useMessages";
import { CreditCard, Coins, DollarSign, Send, CheckCircle, AlertCircle, Wallet } from "lucide-react";

interface MakePaymentPopupProps {
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

export default function MakePaymentPopup({ 
  isOpen, 
  onClose, 
  recipient,
  initialAmount = "",
  initialDescription = "",
  paymentType = 'transfer'
}: MakePaymentPopupProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState('CREDITS');
  const [description, setDescription] = useState(initialDescription);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch

  // Mock user balance - in real app this would come from a hook
  const userBalance = {
    credits: 2450,
    usd: 150,
    vtn: 320
  };

  const canAfford = () => {
    const paymentAmount = parseFloat(amount) || 0;
    switch (currency.toUpperCase()) {
      case 'CREDITS': return userBalance.credits >= paymentAmount;
      case 'USD': return userBalance.usd >= paymentAmount;
      case 'VTN': return userBalance.vtn >= paymentAmount;
      default: return false;
    }
  };

  const handleMakePayment = async () => {
    if (!amount || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in amount and description",
        variant: "destructive"
      });
      return;
    }

    if (!canAfford()) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${currency} to make this payment`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment confirmation message
      const paymentData = {
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        description,
        paymentType,
        paidBy: "current_user", // This would be the actual user
        status: "completed",
        transactionId: `txn_${Date.now()}`
      };

      const actionButtons = [
        {
          label: "View Receipt",
          action: "payment_receipt",
          variant: "outline"
        }
      ];

      await sendMessage(
        `💸 Payment sent: ${currency === 'credits' ? amount + ' credits' : '$' + amount} - ${description}`,
        recipient?.id,
        'payment_confirmation',
        paymentData,
        undefined,
        actionButtons
      );

      toast({
        title: "Payment Sent! ✅",
        description: `${currency === 'credits' ? amount + ' credits' : '$' + amount} sent to ${recipient?.name || 'recipient'}`,
        duration: 5000
      });

      onClose();
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error making payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrencyIcon = () => {
    switch (currency.toUpperCase()) {
      case 'CREDITS': return <Coins className="w-4 h-4" />;
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'VTN': return <CreditCard className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const formatBalance = (bal: number) => {
    return bal.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            Make Payment
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
                <p className="text-xs text-muted-foreground">Payment recipient</p>
              </div>
            </div>
          )}

          {/* Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Balance:</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {formatBalance(userBalance.credits)}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {formatBalance(userBalance.usd)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {formatBalance(userBalance.vtn)}
                  </span>
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
                <SelectContent>
                  <SelectItem value="CREDITS">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Credits
                    </div>
                  </SelectItem>
                  <SelectItem value="USD">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      USD
                    </div>
                  </SelectItem>
                  <SelectItem value="VTN">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      VTN
                    </div>
                  </SelectItem>
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

          {/* Payment Status Indicators */}
          <div className="flex items-center justify-between">
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
            
            {amount && (
              <div className="flex items-center gap-1 text-sm">
                {canAfford() ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Sufficient balance</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">Insufficient balance</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleMakePayment} 
              className="flex-1" 
              disabled={!canAfford() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}