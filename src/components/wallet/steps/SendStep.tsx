import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2, Search } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useMessages } from '@/hooks/useMessages';
import { useToast } from '@/hooks/use-toast';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { CURRENCY_CONFIGS, getCurrencyIcon } from '@/lib/currencies';
import { notifyError, t } from '@/lib/i18n-toast';

interface SendStepProps {
  onBack: () => void;
  onClose: () => void;
}

export function SendStep({ onBack, onClose }: SendStepProps) {
  const { transferFunds, getBalance } = useWallet();
  const { sendMessage } = useMessages(undefined, false);
  const { toast } = useToast();
  const { members, loading: loadingMembers, searchMembers, getDisplayName, getInitials } = useCommunityMembers();
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>('CREDITS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currencies = CURRENCY_CONFIGS;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    searchMembers(value);
  };

  const handleRecipientSelect = (member: any) => {
    setSelectedRecipient(member.user_id);
    setSearchTerm(getDisplayName(member));
  };


  const handleSend = async () => {
    if (!selectedRecipient || !amount || parseFloat(amount) <= 0) {
      notifyError('toasts.wallet.missingInformation', 'toasts.wallet.pleaseSelectRecipientEnterAmount');
      return;
    }

    const sendAmount = parseFloat(amount);
    const currentBalance = getBalance(currency) || 0;

    if (sendAmount > currentBalance) {
      notifyError('toasts.wallet.insufficientBalance2');
      return;
    }

    setIsProcessing(true);

    try {
      await transferFunds(selectedRecipient, currency, sendAmount);

      // Send notification message
      await sendMessage(
        `💸 Payment sent: ${sendAmount} ${currency}${description ? `\n📝 ${description}` : ''}`,
        selectedRecipient,
        'payment_sent',
        {
          type: 'transfer',
          amount: sendAmount,
          currency,
          description,
          recipientId: selectedRecipient
        }
      );

      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    } finally {
      setIsProcessing(false);
    }
  };

  const balance = getBalance(currency) || 0;
  const total = amount ? parseFloat(amount) : 0;
  const isValidAmount = amount && parseFloat(amount) > 0 && total <= balance;
  const selectedMember = members.find(m => m.user_id === selectedRecipient);

  // Filter members based on search
  const filteredMembers = searchTerm 
    ? members.filter(member => 
        getDisplayName(member).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.handle && member.handle.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : members;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Send className="h-5 w-5 text-primary" />
          {t('screens.wallet.sendFunds')}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Recipient Selection */}
        <div className="space-y-2">
          <Label htmlFor="recipient">{t('screens.wallet.send')}</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="recipient"
                placeholder={t('screens.wallet.searchCommunityMembers')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Selected Member Display */}
            {selectedMember && (
              <div className="p-2 bg-primary/5 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedMember.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{getDisplayName(selectedMember)}</div>
                    {selectedMember.email && (
                      <div className="text-xs text-muted-foreground">{selectedMember.email}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRecipient('');
                      setSearchTerm('');
                    }}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
            
            {/* Community Members List */}
            {!selectedRecipient && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {loadingMembers ? 'Loading members...' : `${filteredMembers.length} members found`}
                </p>
                <div className="grid gap-1 max-h-32 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <Button
                      key={member.user_id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRecipientSelect(member)}
                      className="justify-start h-auto py-2 px-2"
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-1">
                        <div className="text-sm font-medium">{getDisplayName(member)}</div>
                        {member.email && (
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amount and Currency */}
        <div className="space-y-2">
          <Label htmlFor="amount">{t('screens.wallet.amount')}</Label>
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
                <SelectContent className="bg-background border-border z-50">
                {currencies.map((curr) => (
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
          <p className="text-xs text-muted-foreground">
            Available: {balance} {currency}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t('screens.wallet.descriptionOptional')}</Label>
          <Textarea
            id="description"
            placeholder={t('screens.wallet.whatSThisFor')}
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
                <span>{t('screens.wallet.amountSend')}</span>
                <span>{parseFloat(amount).toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('screens.wallet.transferFees')}</span>
                <span>{t('screens.wallet.free')}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-medium">
                <span>{t('screens.wallet.totalDeducted2')}</span>
                <span>{total.toFixed(2)} {currency}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t('screens.wallet.cancel')}
          </Button>
          <Button 
            onClick={handleSend}
            disabled={!isValidAmount || !selectedRecipient || isProcessing}
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