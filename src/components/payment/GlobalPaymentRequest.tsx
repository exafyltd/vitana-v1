import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/hooks/useRole';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, DollarSign, Users } from 'lucide-react';
import { notifyError, t } from '@/lib/i18n-toast';

interface GlobalPaymentRequestProps {
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

export default function GlobalPaymentRequest({
  isOpen,
  onClose,
  onSendMessage,
  preSelectedRecipient
}: GlobalPaymentRequestProps) {
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
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSendRequest = async () => {
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
      // Generate a unique request ID
      const requestId = crypto.randomUUID();
      
      // Send payment request message
      const messageContent = `💳 Payment Request\n\n**Amount:** ${numericAmount.toLocaleString()} ${currency}\n**From:** You\n**Description:** ${description || 'Payment request'}\n\nThe recipient can approve or decline this request from their wallet.`;
      
      await onSendMessage(messageContent, 'payment_request', {
        type: 'payment_request',
        requestId,
        amount: numericAmount,
        currency,
        description,
        recipient: selectedRecipient,
        status: 'pending'
      });

      onClose();
    } catch (error) {
      console.error('Request error:', error);
      notifyError('toasts.payment.requestFailed', 'toasts.payment.failedSendPaymentRequestPleaseTry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Request Payment
          </DialogTitle>
        </DialogHeader>

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
                  Searching users...
                </div>
              )}
            </div>
          ) : (
            <div>
              <Label>{t('screens.payment.requestFrom')}</Label>
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
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Currency Selection */}
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VTNA">{t('screens.payment.vtnaTokens')}</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CREDITS">Credits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount">Amount</Label>
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

          {/* Description */}
          <div>
            <Label htmlFor="description">{t('screens.payment.descriptionOptional')}</Label>
            <Textarea
              id="description"
              placeholder={t('screens.payment.whatThisPaymentFor')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendRequest}
              disabled={!selectedRecipient || !amount || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}