import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, DollarSign, Coins, CreditCard, Search } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useMessages } from '@/hooks/useMessages';
import { useToast } from '@/hooks/use-toast';

interface SendStepProps {
  onBack: () => void;
  onClose: () => void;
}

export function SendStep({ onBack, onClose }: SendStepProps) {
  const { transferFunds, getBalance } = useWallet();
  const { sendMessage } = useMessages(undefined, false);
  const { toast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VTN' | 'CREDITS'>('CREDITS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currencies = [
    { value: 'CREDITS', label: 'Credits', icon: CreditCard },
    { value: 'VTN', label: 'VTN Tokens', icon: Coins },
    { value: 'USD', label: 'USD', icon: DollarSign }
  ];

  // Mock community members for demo
  const communityMembers = [
    { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '' },
    { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', avatar: '' },
    { id: 'user3', name: 'Carol Davis', email: 'carol@example.com', avatar: '' },
  ];

  const getCurrencyIcon = (currency: string) => {
    const currencyData = currencies.find(c => c.value === currency);
    if (!currencyData) return null;
    const Icon = currencyData.icon;
    return <Icon className="h-4 w-4" />;
  };

  const handleSend = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const sendAmount = parseFloat(amount);
    const currentBalance = getBalance(currency);

    if (sendAmount > currentBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${currentBalance} ${currency}`,
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      // For demo, use the first community member's ID if no specific recipient selected
      const recipientId = recipient || 'user1';
      
      await transferFunds(recipientId, currency, sendAmount);

      // Send notification message
      await sendMessage(
        `💸 Payment sent: ${sendAmount} ${currency}${description ? `\n📝 ${description}` : ''}`,
        recipientId,
        'payment_sent',
        {
          type: 'transfer',
          amount: sendAmount,
          currency,
          description,
          recipientId
        }
      );

      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    } finally {
      setIsProcessing(false);
    }
  };

  const balance = getBalance(currency);
  const fees = amount ? parseFloat(amount) * 0.005 : 0; // 0.5% fee
  const total = amount ? parseFloat(amount) + fees : 0;
  const isValidAmount = amount && parseFloat(amount) > 0 && total <= balance;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Send className="h-5 w-5 text-primary" />
          Send Funds
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Recipient Selection */}
        <div className="space-y-2">
          <Label htmlFor="recipient">Send to</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="recipient"
                placeholder="Search community members..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Quick Select Community Members */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Quick select:</p>
              <div className="grid gap-1">
                {communityMembers.map((member) => (
                  <Button
                    key={member.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecipient(member.id)}
                    className="justify-start h-auto py-2 px-2"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Amount and Currency */}
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
            />
            <Select value={currency} onValueChange={(value: any) => setCurrency(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    <div className="flex items-center gap-2">
                      {getCurrencyIcon(curr.value)}
                      {curr.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {balance} {currency}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="What's this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Transaction Preview */}
        {amount && parseFloat(amount) > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Amount:</span>
                <span>{parseFloat(amount).toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Transfer fee (0.5%):</span>
                <span>{fees.toFixed(2)} {currency}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-medium">
                <span>Total deducted:</span>
                <span>{total.toFixed(2)} {currency}</span>
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
            onClick={handleSend}
            disabled={!isValidAmount || !recipient || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Funds'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}