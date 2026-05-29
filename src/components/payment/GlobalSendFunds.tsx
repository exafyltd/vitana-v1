import React, { useState } from 'react';
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogHeader, 
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle 
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/hooks/useWallet';
import { useRole } from '@/hooks/useRole';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Send, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notifyError, t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
interface GlobalSendFundsProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  preSelectedRecipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface UserSearchResult {
  user_id: string;
  display_name: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  email: string;
}

export default function GlobalSendFunds({
  isOpen,
  onClose,
  onSendMessage,
  preSelectedRecipient
}: GlobalSendFundsProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(
    preSelectedRecipient ? {
      user_id: preSelectedRecipient.id,
      display_name: preSelectedRecipient.name,
      full_name: preSelectedRecipient.name,
      avatar_url: preSelectedRecipient.avatar || '',
      bio: '',
      email: ''
    } : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [currency, setCurrency] = useState('VTNA');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const { transferFunds, balances, loading } = useWallet();
  const { currentRole } = useRole();
  const { activeTenantId } = useTenant();
  const { toast } = useToast();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const isGlobalContext = currentRole === 'community';
      
      if (isGlobalContext) {
        const { data, error } = await supabase.rpc('search_global_directory', {
          search_term: query
        });
        
        if (error) throw error;
        setSearchResults(data || []);
      } else {
        const { data, error } = await supabase.rpc('search_tenant_directory', {
          search_term: query,
          tenant_id_param: activeTenantId
        });
        
        if (error) throw error;
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      notifyError('toasts.payment.searchError', 'toasts.payment.failedSearchUsersPleaseTryAgain');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFunds = async () => {
    if (!selectedRecipient || !amount || !currency) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseSelectRecipientEnterAmountChoose');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      notifyError('toasts.payment.invalidAmount', 'toasts.payment.pleaseEnterValidAmountGreaterThan');
      return;
    }

    setIsLoading(true);
    try {
      const result = await transferFunds(selectedRecipient.user_id, currency as 'USD' | 'VTNA' | 'CREDITS', numericAmount);
      
      if (result) {
        // Send confirmation message
        const messageContent = `💸 Funds sent successfully!\n\n**Amount:** ${fmtNumber(numericAmount)} ${currency}\n**To:** ${selectedRecipient.display_name}\n**Transaction ID:** ${result.transactionId}`;
        
        await onSendMessage(messageContent, 'system', {
          type: 'payment_sent',
          amount: numericAmount,
          currency,
          recipient: selectedRecipient,
          transactionId: result.transactionId
        });

        onClose();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      notifyError('toasts.payment.transferFailed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentBalance = balances.find(b => b.currency_type === currency)?.balance || 0;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            {t('screens.payment.sendFunds')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-4">
            {/* Recipient Selection */}
            {!selectedRecipient ? (
              <div>
                <Label htmlFor="search">{t('screens.payment.searchUsers')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t('screens.payment.searchByNameEmail')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => {
                          setSelectedRecipient(user);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.display_name?.charAt(0) || user.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.display_name || user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {isSearching && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 animate-pulse" />
                    {t('screens.payment.searchingUsers')}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label>{t('screens.payment.recipient')}</Label>
                <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedRecipient.avatar_url} />
                    <AvatarFallback>
                      {selectedRecipient.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedRecipient.display_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedRecipient.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRecipient(null)}
                  >
                    {t('screens.payment.change')}
                  </Button>
                </div>
              </div>
            )}

            {/* Currency Selection */}
            <div>
              <Label htmlFor="currency">{t('screens.payment.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VTNA">{t('screens.payment.vtnaTokens')}</SelectItem>
                  <SelectItem value="USD">{t('screens.payment.usd')}</SelectItem>
                  <SelectItem value="CREDITS">{t('screens.payment.credits')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{t('screens.payment.availableValue0Currency', { value0: fmtNumber(currentBalance), currency })}</p>
            </div>

            {/* Amount Input */}
            <div>
              <Label htmlFor="amount">{t('screens.payment.amount')}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            {t('screens.payment.cancel')}
          </Button>
          <Button 
            onClick={handleSendFunds}
            disabled={!selectedRecipient || !amount || isLoading || loading}
            className="flex-1"
          >
            {isLoading ? 'Sending...' : 'Send Funds'}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
