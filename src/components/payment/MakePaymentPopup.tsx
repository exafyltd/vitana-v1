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
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import { useCommunityMembers } from "@/hooks/useCommunityMembers";
import { useWallet } from "@/hooks/useWallet";
import { CreditCard, Coins, DollarSign, Send, CheckCircle, AlertCircle, Wallet, Search, Users } from "lucide-react";
import { getCurrencyIcon } from "@/lib/currencies";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
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
  const [selectedRecipient, setSelectedRecipient] = useState(recipient || null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch
  const { members, loading: membersLoading, searchMembers, getDisplayName, getInitials } = useCommunityMembers();
  const { transferFunds, balances } = useWallet();
  const { logActivity } = useActivityLogger();

  const canAfford = () => {
    const paymentAmount = parseFloat(amount) || 0;
    const balance = balances.find(b => b.currency_type === currency.toUpperCase());
    return balance ? balance.balance >= paymentAmount : false;
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      searchMembers(value);
    }
  };

  const handleRecipientSelect = (member: any) => {
    const recipientData = {
      id: member.user_id,
      name: getDisplayName(member),
      avatar: member.avatar_url
    };
    setSelectedRecipient(recipientData);
    setSearchTerm(getDisplayName(member));
  };

  const handleMakePayment = async () => {
    if (!amount || !description) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
      return;
    }

    if (!selectedRecipient) {
      notifyError('toasts.payment.noRecipientSelected', 'toasts.payment.pleaseSelectWhoSendPayment');
      return;
    }

    if (!canAfford()) {
      notifyError('toasts.payment.insufficientBalance');
      return;
    }

    setIsProcessing(true);

    try {
      // Perform actual wallet transfer
      await transferFunds(selectedRecipient.id, currency.toUpperCase() as 'CREDITS' | 'USD', parseFloat(amount));

      // Log wallet transfer activity
      await logActivity({
        activityType: 'wallet.transfer',
        activityData: {
          amount: parseFloat(amount),
          currency: currency.toUpperCase(),
          recipient_id: selectedRecipient.id,
          recipient_name: selectedRecipient.name,
          description,
          paymentType,
        },
        dedupeKey: `wallet-transfer-${Date.now()}`,
      });

      // Send notification message
      await sendMessage(
        `💸 Payment sent: ${currency === 'CREDITS' ? amount + ' credits' : '$' + amount} - ${description}`,
        selectedRecipient.id,
        'payment_confirmation',
        {
          amount: parseFloat(amount),
          currency: currency.toUpperCase(),
          description,
          paymentType,
          status: "completed"
        }
      );

      notify('toasts.payment.paymentSent');

      onClose();
      setAmount('');
      setDescription('');
      setSelectedRecipient(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Error making payment:', error);
      notifyError('toasts.payment.paymentFailed', 'toasts.payment.failedProcessPaymentPleaseTryAgain');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBalance = (bal: number) => {
    return fmtDateTime(bal);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            {t('screens.payment.makePayment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Selection */}
          <div>
            <Label htmlFor="recipient">{t('screens.payment.send')}</Label>
            {selectedRecipient ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedRecipient.avatar} />
                  <AvatarFallback>{selectedRecipient.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedRecipient.name}</p>
                  <p className="text-xs text-muted-foreground">{t('screens.payment.paymentRecipient')}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedRecipient(null);
                    setSearchTerm('');
                  }}
                >{t('screens.payment.change')}
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="recipient"
                    placeholder={t('screens.payment.searchForCommunityMember')}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchTerm && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-background">
                    {membersLoading ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">{t('screens.payment.searching')}
                      </div>
                    ) : members.length > 0 ? (
                      members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleRecipientSelect(member)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback>{getInitials(member)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{getDisplayName(member)}</p>
                            <p className="text-xs text-muted-foreground">{t('screens.payment.communityMember')}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        {t('screens.payment.noMembersFound')}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Balance Display */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('screens.payment.yourBalance2')}</span>
                <div className="flex items-center gap-4">
                  {balances.map((balance) => (
                    <span key={balance.currency_type} className="flex items-center gap-1">
                      {getCurrencyIcon(balance.currency_type, 'w-3 h-3')}
                      {formatBalance(balance.balance)}
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
                <SelectContent>
                  <SelectItem value="CREDITS">
                    <div className="flex items-center gap-2">{t('screens.payment.value0Credits2', { value0: getCurrencyIcon('CREDITS', 'w-4 h-4') })}
                    </div>
                  </SelectItem>
                  <SelectItem value="USD">
                    <div className="flex items-center gap-2">{t('screens.payment.value0Usd', { value0: getCurrencyIcon('USD', 'w-4 h-4') })}
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

          {/* Payment Status Indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t('screens.payment.paymenttypePayment', { paymentType })}
              </Badge>
              {currency.toUpperCase() === 'CREDITS' && (
                <Badge variant="secondary">{t('screens.payment.platformCredits')}
                </Badge>
              )}
            </div>
            
            {amount && (
              <div className="flex items-center gap-1 text-sm">
                {canAfford() ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">{t('screens.payment.sufficientBalance')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{t('screens.payment.insufficientBalance2')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleMakePayment} 
              className="flex-1" 
              disabled={!selectedRecipient || !canAfford() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{t('screens.payment.processing')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('screens.payment.sendPayment')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}