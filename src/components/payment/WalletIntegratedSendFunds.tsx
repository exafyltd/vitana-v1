import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useWallet } from '@/hooks/useWallet';
import { Send, Loader2 } from 'lucide-react';
import { CURRENCY_CONFIGS, getCurrencyIcon } from '@/lib/currencies';
import { t } from '@/lib/i18n-toast';

interface WalletIntegratedSendFundsProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  recipient: {
    id: string;
    name?: string;
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
  const [currency, setCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>('USD');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  
  const { getBalance, transferFunds, refreshData, loading } = useWallet();
  
  // Use preloaded recipient data directly - no loading needed
  const effectiveRecipient = {
    ...recipient,
    name: recipient.name || 'Recipient'
  };

  const currencies = CURRENCY_CONFIGS;

  const userBalance = getBalance(currency) || 0;
  const canAfford = parseFloat(amount || '0') <= userBalance;

  const handleSend = async () => {
    if (!amount || !recipient.id || parseFloat(amount) <= 0 || !canAfford) {
      return;
    }

    // Store values before reset
    const numericAmount = parseFloat(amount);
    const desc = description;
    
    // Reset form and close immediately
    setAmount('');
    setDescription('');
    onClose();

    // Process transfer in background
    try {
      // Perform the actual wallet transfer (this already calls refreshData internally)
      const result = await transferFunds(recipient.id, currency, numericAmount);
      
      if (result && result.id) {
        // Send a confirmation message to the chat (fire-and-forget)
        onSendMessage(
          `✅ Payment completed: ${numericAmount.toLocaleString()} ${currency}${desc ? ` - ${desc}` : ''}`,
          'payment_confirmation',
          {
            amount: numericAmount,
            currency,
            description: desc,
            status: 'completed',
            transactionId: result.id,
            completedAt: new Date().toISOString()
          }
        ).catch((error) => {
          console.error('Error sending confirmation message:', error);
        });
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            {t('screens.payment.sendFunds')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarImage src={effectiveRecipient.avatar} alt={effectiveRecipient.name} />
              <AvatarFallback>{effectiveRecipient.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{effectiveRecipient.name}</p>
              <p className="text-xs text-muted-foreground">{t('screens.payment.recipient')}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('screens.payment.amount')}</Label>
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
              <Select value={currency} onValueChange={(value: 'USD' | 'VTNA' | 'CREDITS') => setCurrency(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {currencies.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      <div className="flex items-center gap-2">
                        {getCurrencyIcon(curr.value)}
                        {curr.fullLabel}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Balance Display */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('screens.payment.availableBalance')}</span>
              <div className="flex items-center gap-1">
                {getCurrencyIcon(currency)}
                <span className={`font-medium ${!canAfford && amount ? 'text-destructive' : ''}`}>
                  {userBalance.toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('screens.payment.descriptionOptional')}</Label>
            <Textarea
              id="description"
              placeholder={t('screens.payment.whatSThisPaymentFor')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Transaction Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('screens.payment.sending')}</span>
                <div className="flex items-center gap-1 font-medium">
                  {getCurrencyIcon(currency)}
                  {parseFloat(amount).toLocaleString()} {currency}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{t('screens.payment.fee')}</span>
                <span className="text-muted-foreground">{t('screens.payment.free')}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{t('screens.payment.total')}</span>
                  <div className="flex items-center gap-1">
                    {getCurrencyIcon(currency)}
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
            >
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleSend}
              className="flex-1"
              disabled={
                !amount || 
                !recipient.id || 
                parseFloat(amount || '0') <= 0 || 
                !canAfford
              }
            >
              <Send className="w-4 h-4 mr-2" />
              {t('screens.payment.sendFunds')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}