import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { DollarSign, Coins, Zap, Send, Loader2 } from 'lucide-react';

interface WalletIntegratedSendFundsProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  recipient: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function WalletIntegratedSendFunds({
  isOpen,
  onClose,
  onSendMessage,
  recipient
}: WalletIntegratedSendFundsProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VTN' | 'CREDITS'>('USD');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const { balances, transferFunds } = useWallet();

  const currencies = [
    { value: 'USD' as const, label: 'USD', icon: DollarSign },
    { value: 'VTN' as const, label: 'VTN', icon: Coins },
    { value: 'CREDITS' as const, label: 'Credits', icon: Zap },
  ];

  const getCurrencyIcon = (currencyType: string) => {
    const currency = currencies.find(c => c.value === currencyType);
    if (!currency) return DollarSign;
    return currency.icon;
  };

  const userBalance = balances.find(b => b.currency_type === currency)?.balance || 0;
  const canAfford = parseFloat(amount || '0') <= userBalance;

  const handleSend = async () => {
    if (!amount || !recipient.id || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!canAfford) {
      toast({
        title: "Insufficient Funds",
        description: `You don't have enough ${currency} to send this amount`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Perform the actual wallet transfer
      const result = await transferFunds(recipient.id, currency, parseFloat(amount));
      
      if (result.success) {
        // Send a notification message to the chat
        await onSendMessage(
          `💰 Sent ${amount} ${currency}${description ? ` - ${description}` : ''}`,
          'payment_sent',
          {
            type: 'fund_transfer',
            amount: parseFloat(amount),
            currency,
            recipient_id: recipient.id,
            recipient_name: recipient.name,
            description,
            transaction_id: result.transaction_id
          }
        );

        toast({
          title: "💸 Funds Sent Successfully!",
          description: `${amount} ${currency} sent to ${recipient.name}`,
          duration: 5000,
        });

        // Reset form and close
        setAmount('');
        setDescription('');
        onClose();
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to send funds. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Send Funds
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarImage src={recipient.avatar} alt={recipient.name} />
              <AvatarFallback>{recipient.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{recipient.name}</p>
              <p className="text-xs text-muted-foreground">Recipient</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
                min="0"
                step="0.01"
              />
              <Select value={currency} onValueChange={(value: 'USD' | 'VTN' | 'CREDITS') => setCurrency(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(curr => {
                    const Icon = curr.icon;
                    return (
                      <SelectItem key={curr.value} value={curr.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {curr.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Balance Display */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available Balance:</span>
              <div className="flex items-center gap-1">
                {React.createElement(getCurrencyIcon(currency), { className: "w-4 h-4" })}
                <span className={`font-medium ${!canAfford && amount ? 'text-destructive' : ''}`}>
                  {userBalance.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this payment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Transaction Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending:</span>
                <div className="flex items-center gap-1 font-medium">
                  {React.createElement(getCurrencyIcon(currency), { className: "w-4 h-4" })}
                  {parseFloat(amount).toLocaleString()} {currency}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Fee:</span>
                <span className="text-muted-foreground">Free</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total:</span>
                  <div className="flex items-center gap-1">
                    {React.createElement(getCurrencyIcon(currency), { className: "w-4 h-4" })}
                    {parseFloat(amount).toLocaleString()} {currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              className="flex-1"
              disabled={
                !amount || 
                !recipient.id || 
                parseFloat(amount || '0') <= 0 || 
                !canAfford || 
                isProcessing
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Funds
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}