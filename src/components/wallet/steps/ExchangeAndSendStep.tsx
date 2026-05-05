import React, { useState } from 'react';
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Zap, Loader2, DollarSign, Coins, CreditCard, Search, ArrowUpDown } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';
import { useMessages } from '@/hooks/useMessages';
import { useToast } from '@/hooks/use-toast';
import { calculateExchange } from '@/lib/exchangeRates';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ExchangeAndSendStepProps {
  onBack: () => void;
  onClose: () => void;
}

export function ExchangeAndSendStep({ onBack, onClose }: ExchangeAndSendStepProps) {
  // Hide exchange-and-send on iOS — prototype feature only
  if (isIAPRestricted()) return null;
  const { exchangeCurrency, transferFunds, getBalance, exchangeAndSend } = useWallet();
  const { sendMessage } = useMessages(undefined, false);
  const { toast } = useToast();
  const { members, loading: loadingMembers, searchMembers, getDisplayName, getInitials } = useCommunityMembers();
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>('CREDITS');
  const [toCurrency, setToCurrency] = useState<'USD' | 'VTNA' | 'CREDITS'>('VTNA');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const currencies = [
    { value: 'CREDITS', label: 'Credits', icon: CreditCard },
    { value: 'VTNA', label: 'VTNA Tokens', icon: Coins },
    { value: 'USD', label: 'USD', icon: DollarSign }
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    searchMembers(value);
  };

  const handleRecipientSelect = (member: any) => {
    setSelectedRecipient(member.user_id);
    setSearchTerm(getDisplayName(member));
  };

  const getCurrencyIcon = (currency: string) => {
    const currencyData = currencies.find(c => c.value === currency);
    if (!currencyData) return null;
    const Icon = currencyData.icon;
    return <Icon className="h-4 w-4" />;
  };

  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleExchangeAndSend = async () => {
    if (!selectedRecipient || !amount || parseFloat(amount) <= 0) {
      notifyError('toasts.wallet.missingInformation', 'toasts.wallet.pleaseSelectRecipientEnterAmount');
      return;
    }

    const exchangeAmount = parseFloat(amount);
    const currentBalance = getBalance(fromCurrency) || 0;

    if (exchangeAmount > currentBalance) {
      notifyError('toasts.wallet.insufficientBalance2');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate exchange rate
      const exchangeRate = fromCurrency === 'CREDITS' && toCurrency === 'VTNA' ? 1.0 : 
                          fromCurrency === 'VTNA' && toCurrency === 'CREDITS' ? 1.0 :
                          fromCurrency === 'USD' && toCurrency === 'VTNA' ? 100 :
                          fromCurrency === 'VTNA' && toCurrency === 'USD' ? 0.01 : 1.0;

      // Use atomic exchange and send operation
      const result = await exchangeAndSend(selectedRecipient, fromCurrency, toCurrency, exchangeAmount, exchangeRate);
      
      if (result) {
        // Send notification message
        await sendMessage(
          `💱➡️ Exchange & Send completed: ${exchangeAmount} ${fromCurrency} → ${result.netAmount.toFixed(2)} ${toCurrency}${description ? `\n📝 ${description}` : ''}`,
          selectedRecipient,
          'exchange_and_send',
          {
            type: 'exchange_and_send',
            fromAmount: exchangeAmount,
            fromCurrency,
            toAmount: result.netAmount,
            toCurrency,
            description,
            recipientId: selectedRecipient,
            exchangeTransactionId: result.exchangeTransactionId,
            transferTransactionId: result.transferTransactionId
          }
        );

        // Success toast
        notify('toasts.wallet.exchangeSendComplete');
      }

      onClose();
    } catch (error) {
      // Error handling is done in the hooks
    } finally {
      setIsProcessing(false);
    }
  };

  const balance = getBalance(fromCurrency) || 0;
  const calculation = amount ? calculateExchange(parseFloat(amount), fromCurrency, toCurrency) : null;
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= balance;
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
          <Zap className="h-5 w-5 text-purple-600" />
          Exchange & Send
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
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedMember.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{getDisplayName(selectedMember)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRecipient('');
                      setSearchTerm('');
                    }}
                    className="h-5 w-5 p-0 text-xs"
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
                  {loadingMembers ? 'Loading...' : `${filteredMembers.length} members`}
                </p>
                <div className="grid gap-1 max-h-24 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <Button
                      key={member.user_id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRecipientSelect(member)}
                      className="justify-start h-auto py-1 px-2"
                    >
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="text-xs font-medium">{getDisplayName(member)}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Exchange Setup */}
        <div className="space-y-3">
          <Label>{t('screens.wallet.exchangeSendAmount')}</Label>
          
          {/* From Currency */}
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
            <Select value={fromCurrency} onValueChange={(value: any) => setFromCurrency(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    <div className="flex items-center gap-1">
                      {getCurrencyIcon(currency.value)}
                      <span className="text-xs">{currency.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {balance} {fromCurrency}
          </p>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapCurrencies}
              className="rounded-full h-8 w-8 p-0"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('screens.wallet.theyLlReceive')}</span>
            <Select value={toCurrency} onValueChange={(value: any) => setToCurrency(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.filter(c => c.value !== fromCurrency).map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    <div className="flex items-center gap-1">
                      {getCurrencyIcon(currency.value)}
                      <span className="text-xs">{currency.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        {calculation && (
          <Card className="bg-gradient-to-r from-purple-50/30 to-blue-50/30 border-purple-200/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('screens.wallet.youSend2')}</span>
                <span className="font-medium">{parseFloat(amount).toFixed(2)} {fromCurrency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('screens.wallet.theyReceive')}</span>
                <span className="font-medium text-purple-700">{calculation.toAmount.toFixed(2)} {toCurrency}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('screens.wallet.exchangeRate')}</span>
                <span>1 {fromCurrency} = {calculation.rate} {toCurrency}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('screens.wallet.totalFees')}</span>
                <span>{(calculation.fees + calculation.toAmount * 0.005).toFixed(3)} {fromCurrency}</span>
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
            onClick={handleExchangeAndSend}
            disabled={!isValidAmount || !selectedRecipient || isProcessing || fromCurrency === toCurrency}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Exchange & Send'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}