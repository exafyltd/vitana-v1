import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Coins, 
  CreditCard,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface PaymentMessageHandlerProps {
  message: any;
  onUpdateMessage?: (messageId: string, updates: any) => void;
  onSendReply?: (content: string, messageType?: string, contentData?: any) => Promise<void>;
}

export function PaymentMessageHandler({ 
  message, 
  onUpdateMessage,
  onSendReply 
}: PaymentMessageHandlerProps) {
  const { user } = useAuth();
  const { 
    balances, 
    getBalance: walletGetBalance,
    updateBalance, 
    exchangeCurrency, 
    transferFunds, 
    exchangeAndSend, 
    refreshData,
    loading,
    error: walletError
  } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [forceRefreshBalance, setForceRefreshBalance] = useState(false);

  // Initialize local lock and declined status based on message id
  useEffect(() => {
    const lock = getLocalStorageItem('global', 'payments', `lock:${message.id}`);
    const declined = getLocalStorageItem('global', 'payments', `declined:${message.id}`);
    setIsLocked(lock === '1');
    setIsDeclined(declined === '1');
  }, [message.id]);

  // Add timeout for wallet loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);
  
  const paymentData = message.content_data;
  const isCurrentUser = message.sender_id === user?.id;
  const messageType = message.message_type;

  // Remove excessive wallet refresh from payment handlers
  // Force refresh wallet data when payment modal is opened
  useEffect(() => {
    if (!isCurrentUser && messageType === 'payment_request') {
      // Single refresh only, no excessive polling
      refreshData();
    }
  }, [message.id, isCurrentUser, messageType]); // Remove refreshData from deps to prevent loops

  const getCurrencyIcon = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'CREDITS': return <Coins className="w-4 h-4" />;
      case 'VTNA': return <CreditCard className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return `$${amount.toLocaleString()}`;
      case 'CREDITS': return `${amount.toLocaleString()} Credits`;
      case 'VTNA': return `${amount.toLocaleString()} VTNA`;
      default: return `${amount} ${currency}`;
    }
  };

  const canAfford = (amount: number, currency: string) => {
    const normalizedCurrency = (currency || '').toUpperCase() as 'USD' | 'VTNA' | 'CREDITS';
    const balance = walletGetBalance(normalizedCurrency);
    const canPay = typeof balance === 'number' ? balance >= amount : true; // unknown balance -> allow attempt
    console.log(`💰 Can afford ${amount} ${currency}? ${canPay} (current balance:`, balance, ')');
    return canPay;
  };

  const handleRefreshBalance = async () => {
    console.log('🔄 Manual balance refresh requested');
    setForceRefreshBalance(true);
    try {
      await refreshData();
      notify('toasts.payment.balanceRefreshed', 'toasts.payment.walletBalanceHasUpdated');
    } catch (error) {
      notifyError('toasts.payment.refreshFailed', 'toasts.payment.couldNotRefreshBalancePleaseTry');
    } finally {
      setForceRefreshBalance(false);
    }
  };

  const handlePaymentAccept = async () => {
    if (!onSendReply || !onUpdateMessage) return;

    // Prevent duplicate processing
    if (paymentData?.status && paymentData.status !== 'pending') {
      notify('toasts.payment.alreadyProcessed');
      return;
    }
    if (isLocked) {
      notify('toasts.payment.alreadyAccepted', 'toasts.payment.thisPaymentRequestAlreadyAccepted');
      return;
    }

    // Lock immediately to avoid rapid re-clicks across re-renders
    setLocalStorageItem('global', 'payments', `lock:${message.id}`, '1');
    setIsLocked(true);
    setIsProcessing(true);
    setIsCompleted(true); // Immediately disable UI
    
    const { amount, currency, description } = paymentData;
    
    // Show instant success feedback
    notify('toasts.payment.paymentCompleted');
    
    // Send confirmation message immediately
    try {
      await onSendReply?.(
        `✅ Payment completed: ${formatCurrency(amount, currency)} - ${description}`,
        'payment_confirmation',
        {
          ...paymentData,
          status: 'completed',
          completedBy: user?.id,
          completedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error sending confirmation message:', error);
    }

    try {
      if (!canAfford(amount, currency)) {
        throw new Error(`Insufficient ${currency} balance`);
      }

      // Perform the atomic transfer in background
      const result = await transferFunds(
        message.sender_id, 
        currency.toUpperCase() as "USD" | "VTNA" | "CREDITS", 
        amount
      );

      if (result) {
        // Update the original message status with transaction ID
        await onUpdateMessage?.(message.id, {
          content_data: {
            ...paymentData,
            status: 'completed',
            transactionId: result.id
          }
        });
      }

    } catch (error: any) {
      console.error('Payment acceptance error:', error);
      setIsCompleted(false); // Reset on error so user can retry
      setIsLocked(false);
      setLocalStorageItem('global', 'payments', `lock:${message.id}`, '0');
      notifyError('toasts.payment.paymentFailed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentDecline = async () => {
    if (!onSendReply || !onUpdateMessage) return;

    // Prevent duplicate processing
    if (paymentData?.status && paymentData.status !== 'pending') {
      notify('toasts.payment.alreadyProcessed');
      return;
    }
    if (isDeclined || isLocked) {
      notify('toasts.payment.alreadyProcessed', 'toasts.payment.thisPaymentRequestHasAlreadyProcessed');
      return;
    }

    // Lock immediately to avoid duplicate actions
    setLocalStorageItem('global', 'payments', `declined:${message.id}`, '1');
    setLocalStorageItem('global', 'payments', `lock:${message.id}`, '1');
    setIsDeclined(true);
    setIsLocked(true);
    setIsProcessing(true);

    try {
      const { amount, currency, description } = paymentData;
      
      await onSendReply?.(
        `❌ Payment declined: ${formatCurrency(amount, currency)} - ${description}`,
        'payment_declined',
        {
          ...paymentData,
          status: 'declined',
          declinedBy: user?.id,
          declinedAt: new Date().toISOString()
        }
      );

      // Update the original message status
      await onUpdateMessage?.(message.id, {
        content_data: { ...paymentData, status: 'declined' }
      });

      notify('toasts.payment.paymentDeclined', 'toasts.payment.paymentRequestHasDeclined');

    } catch (error: any) {
      console.error('Payment decline error:', error);
      // Reset on error so user can retry
      setIsDeclined(false);
      setIsLocked(false);
      setLocalStorageItem('global', 'payments', `declined:${message.id}`, '0');
      setLocalStorageItem('global', 'payments', `lock:${message.id}`, '0');
      notifyError('toasts.payment.error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExchangeAndSendAccept = async () => {
    if (!onSendReply || !onUpdateMessage) return;

    // Prevent duplicate processing
    if (paymentData?.status && paymentData.status !== 'pending') {
      notify('toasts.payment.alreadyProcessed');
      return;
    }
    if (isLocked) {
      notify('toasts.payment.alreadyAccepted', 'toasts.payment.thisRequestAlreadyAccepted');
      return;
    }

    // Lock immediately
    setLocalStorageItem('global', 'payments', `lock:${message.id}`, '1');
    setIsLocked(true);
    setIsProcessing(true);
    setIsCompleted(true); // Immediately disable UI
    
    const { fromAmount, fromCurrency, toCurrency, description, exchangeRate, toUserId } = paymentData;
    
    // Show instant success feedback
    const convertedAmount = fromAmount * exchangeRate;
    notify('toasts.payment.exchangeSendSuccessful');
    
    // Send confirmation message immediately
    try {
      await onSendReply?.(
        `✅ Exchange & Send completed: ${formatCurrency(convertedAmount, toCurrency)} - ${description}`,
        'payment_confirmation',
        {
          ...paymentData,
          status: 'completed',
          completedBy: user?.id,
          completedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error sending confirmation message:', error);
    }

    try {
      const { 
        originalAmount, 
        originalCurrency, 
        exchangedAmount, 
        exchangedCurrency, 
        exchangeRate,
        description 
      } = paymentData;

      if (!canAfford(originalAmount, originalCurrency)) {
        notifyError('toasts.payment.insufficientBalance');
        return;
      }

      // Perform atomic exchange and send in one operation
      const result = await exchangeAndSend(
        message.sender_id,
        originalCurrency.toUpperCase() as "USD" | "VTNA" | "CREDITS",
        exchangedCurrency.toUpperCase() as "USD" | "VTNA" | "CREDITS",
        originalAmount,
        exchangeRate
      );

      if (result) {
        // Refresh wallet data to show updated balances
        await refreshData();
        
        // Update the original message status
        await onUpdateMessage?.(message.id, {
          content_data: {
            ...paymentData,
            status: 'completed',
            exchangeTransactionId: result.exchangeTransactionId,
            transferTransactionId: result.transferTransactionId
          }
        });

        await onSendReply?.(
          `🔄✅ Exchange & Send completed: ${formatCurrency(originalAmount, originalCurrency)} → ${formatCurrency(result.netAmount, exchangedCurrency)}`,
          'exchange_and_send_confirmation',
          {
            ...paymentData,
            status: 'completed',
            completedBy: user?.id,
            completedAt: new Date().toISOString(),
            exchangeTransactionId: result.exchangeTransactionId,
            transferTransactionId: result.transferTransactionId,
            netAmount: result.netAmount
          }
        );

        notify('toasts.payment.exchangeSendCompleted');
      }

    } catch (error) {
      console.error('Exchange and send error:', error);
      setIsCompleted(false); // Reset on error so user can retry
      notifyError('toasts.payment.transactionFailed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'declined': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const renderPaymentRequest = () => {
  const { amount, currency, description, status = 'pending' } = paymentData;
    const balanceVal = walletGetBalance((currency || '').toUpperCase() as 'USD' | 'VTNA' | 'CREDITS');
    const currentBalanceDisplay = balanceVal === null ? '—' : balanceVal.toLocaleString();
    const canPay = canAfford(amount, currency);
    const effectiveStatus = isDeclined ? 'declined' : isCompleted ? 'completed' : status;

    return (
      <Card className={`${getStatusColor(effectiveStatus)} max-w-sm w-full sm:w-auto`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getCurrencyIcon(currency)}
              <span className="font-semibold text-lg">
                {formatCurrency(amount, currency)}
              </span>
            </div>
            <Badge variant={effectiveStatus === 'completed' ? 'default' : effectiveStatus === 'declined' ? 'destructive' : 'secondary'}>
              {getStatusIcon(effectiveStatus)}
              <span className="ml-1 capitalize">{effectiveStatus}</span>
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          
          {/* Show current balance for non-current users */}
          {!isCurrentUser && effectiveStatus === 'pending' && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('screens.payment.yourBalance3')}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    {getCurrencyIcon(currency)}
                    {currentBalanceDisplay}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshBalance}
                    disabled={forceRefreshBalance}
                    className="h-6 px-2 text-xs"
                  >
                    {forceRefreshBalance ? '...' : '🔄'}
                  </Button>
                </div>
              </div>
              {walletError && walletError.includes('authenticated') && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {t('screens.payment.authenticationRequiredPleaseSignViewBalance')}
                </div>
              )}
              {walletError && walletError.includes('permission') && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {t('screens.payment.permissionErrorUnableAccessWalletData')}
                </div>
              )}
            </div>
          )}

          {/* Action buttons for recipient */}
          {!isCurrentUser && effectiveStatus === 'pending' && (
            <div className="flex gap-2">
              <Button 
                onClick={handlePaymentAccept}
                disabled={isCompleted || isDeclined || isProcessing || isLocked || (loading && !loadingTimeout) || (typeof balanceVal === 'number' && !canPay)}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : 
                 (loading && !loadingTimeout) ? 'Checking...' : 
                 (balanceVal === null) ? 'Checking...' :
                 loadingTimeout ? 'Accept (Wallet Error)' :
                 canPay ? 'Accept' : 'Insufficient Balance'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePaymentDecline}
                disabled={isCompleted || isDeclined || isProcessing || isLocked}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : 'Decline'}
              </Button>
            </div>
          )}

          {/* Show status for processed requests */}
          {!isCurrentUser && (effectiveStatus === 'completed' || effectiveStatus === 'declined') && (
            <div className="flex items-center justify-center py-2">
              <Badge variant={effectiveStatus === 'completed' ? 'default' : 'destructive'} className="flex items-center gap-1">
                {getStatusIcon(effectiveStatus)}
                <span className="capitalize">{effectiveStatus === 'completed' ? 'Accepted' : 'Declined'}</span>
              </Badge>
            </div>
          )}

          {/* Insufficient balance warning */}
          {!isCurrentUser && effectiveStatus === 'pending' && typeof balanceVal === 'number' && balanceVal < amount && (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span>{t('screens.payment.insufficientCurrencyBalance', { currency })}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderExchangeAndSend = () => {
    const { 
      originalAmount, 
      originalCurrency, 
      exchangedAmount, 
      exchangedCurrency, 
      exchangeRate,
      description,
      status = 'pending'
    } = paymentData;
    
    const effectiveStatus = isDeclined ? 'declined' : isCompleted ? 'completed' : status;

    return (
      <Card className={`${getStatusColor(effectiveStatus)} max-w-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{t('screens.payment.exchangeSend')}</span>
                <Badge variant="secondary" className="text-xs">
                  Rate: {exchangeRate.toFixed(3)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatCurrency(originalAmount, originalCurrency)}</span>
                <span>→</span>
                <span>{formatCurrency(exchangedAmount, exchangedCurrency)}</span>
              </div>
            </div>
            <Badge variant={effectiveStatus === 'completed' ? 'default' : effectiveStatus === 'declined' ? 'destructive' : 'secondary'}>
              {getStatusIcon(effectiveStatus)}
              <span className="ml-1 capitalize">{effectiveStatus}</span>
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{description}</p>

          {!isCurrentUser && effectiveStatus === 'pending' && (
            <div className="flex gap-2">
              <Button 
                onClick={handleExchangeAndSendAccept}
                disabled={isCompleted || isDeclined || !canAfford(originalAmount, originalCurrency) || isProcessing || isLocked}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : 'Accept Exchange'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePaymentDecline}
                disabled={isCompleted || isDeclined || isProcessing || isLocked}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : 'Decline'}
              </Button>
            </div>
          )}

          {/* Show status for processed requests */}
          {!isCurrentUser && (effectiveStatus === 'completed' || effectiveStatus === 'declined') && (
            <div className="flex items-center justify-center py-2">
              <Badge variant={effectiveStatus === 'completed' ? 'default' : 'destructive'} className="flex items-center gap-1">
                {getStatusIcon(effectiveStatus)}
                <span className="capitalize">{effectiveStatus === 'completed' ? 'Accepted' : 'Declined'}</span>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPaymentConfirmation = () => {
    const { amount, currency, description, transactionId } = paymentData;

    return (
      <Card className="bg-green-50 border-green-200 max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">{t('screens.payment.paymentCompleted')}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {getCurrencyIcon(currency)}
            <span className="font-semibold text-lg text-green-700">
              {formatCurrency(amount, currency)}
            </span>
          </div>
          <p className="text-sm text-green-700 mb-2">{description}</p>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Receipt className="w-3 h-3" />
            <span>{t('screens.payment.idTransactionid', { transactionId })}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Main render logic
  switch (messageType) {
    case 'payment_request':
      return renderPaymentRequest();
    case 'exchange_and_send':
      return renderExchangeAndSend();
    case 'payment_confirmation':
    case 'exchange_and_send_confirmation':
      return renderPaymentConfirmation();
    default:
      return null;
  }
}