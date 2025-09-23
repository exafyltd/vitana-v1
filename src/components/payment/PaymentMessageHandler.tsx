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
    loading
  } = useWallet();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Initialize local lock based on message id
  useEffect(() => {
    const lock = getLocalStorageItem('global', 'payments', `lock:${message.id}`);
    setIsLocked(lock === '1');
  }, [message.id]);
  const paymentData = message.content_data;
  const isCurrentUser = message.sender_id === user?.id;
  const messageType = message.message_type;

  const getCurrencyIcon = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return <DollarSign className="w-4 h-4" />;
      case 'CREDITS': return <Coins className="w-4 h-4" />;
      case 'VTN': return <CreditCard className="w-4 h-4" />;
      default: return <Coins className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return `$${amount.toLocaleString()}`;
      case 'CREDITS': return `${amount.toLocaleString()} Credits`;
      case 'VTN': return `${amount.toLocaleString()} VTN`;
      default: return `${amount} ${currency}`;
    }
  };

  const canAfford = (amount: number, currency: string) => {
    const normalizedCurrency = (currency || '').toUpperCase() as 'USD' | 'VTN' | 'CREDITS';
    return walletGetBalance(normalizedCurrency) >= amount;
  };

  const handlePaymentAccept = async () => {
    if (!onSendReply || !onUpdateMessage) return;

    // Prevent duplicate processing
    if (paymentData?.status && paymentData.status !== 'pending') {
      toast({ title: "Already processed", description: `This request is ${paymentData.status}.`, duration: 3000 });
      return;
    }
    if (isLocked) {
      toast({ title: "Already accepted", description: "This payment request was already accepted.", duration: 3000 });
      return;
    }

    // Lock immediately to avoid rapid re-clicks across re-renders
    setLocalStorageItem('global', 'payments', `lock:${message.id}`, '1');
    setIsLocked(true);
    setIsProcessing(true);
    setIsCompleted(true); // Immediately disable UI
    try {
      const { amount, currency, description } = paymentData;
      
      if (!canAfford(amount, currency)) {
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough ${currency} to complete this payment`,
          variant: "destructive"
        });
        return;
      }

      // Perform the atomic transfer
      const result = await transferFunds(
        message.sender_id, 
        currency.toUpperCase() as "USD" | "VTN" | "CREDITS", 
        amount
      );

      if (result) {
        // Refresh wallet data to show updated balances
        await refreshData();
        
        // Update the original message status
        await onUpdateMessage?.(message.id, {
          content_data: {
            ...paymentData,
            status: 'completed',
            transactionId: result.id
          }
        });

        // Send confirmation message
        await onSendReply?.(
          `✅ Payment completed: ${formatCurrency(amount, currency)} - ${description}`,
          'payment_confirmation',
          {
            ...paymentData,
            status: 'completed',
            completedBy: user?.id,
            completedAt: new Date().toISOString(),
            transactionId: result.id
          }
        );

        toast({
          title: "Payment Completed! ✅",
          description: `${formatCurrency(amount, currency)} sent successfully`,
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('Payment acceptance error:', error);
      setIsCompleted(false); // Reset on error so user can retry
      setIsLocked(false);
      setLocalStorageItem('global', 'payments', `lock:${message.id}`, '0');
      toast({
        title: "Payment Failed",
        description: (error && (error.message || error.toString())) || "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentDecline = async () => {
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
      onUpdateMessage?.(message.id, {
        content_data: { ...paymentData, status: 'declined' }
      });

      toast({
        title: "Payment Declined",
        description: "Payment request has been declined",
      });

    } catch (error) {
      console.error('Payment decline error:', error);
      toast({
        title: "Error",
        description: "Failed to decline payment",
        variant: "destructive"
      });
    }
  };

  const handleExchangeAndSendAccept = async () => {
    if (!onSendReply || !onUpdateMessage) return;

    // Prevent duplicate processing
    if (paymentData?.status && paymentData.status !== 'pending') {
      toast({ title: "Already processed", description: `This request is ${paymentData.status}.`, duration: 3000 });
      return;
    }
    if (isLocked) {
      toast({ title: "Already accepted", description: "This request was already accepted.", duration: 3000 });
      return;
    }

    // Lock immediately
    setLocalStorageItem('global', 'payments', `lock:${message.id}`, '1');
    setIsLocked(true);
    setIsProcessing(true);
    setIsCompleted(true); // Immediately disable UI
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
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough ${originalCurrency} for this exchange`,
          variant: "destructive"
        });
        return;
      }

      // Perform atomic exchange and send in one operation
      const result = await exchangeAndSend(
        message.sender_id,
        originalCurrency.toUpperCase() as "USD" | "VTN" | "CREDITS",
        exchangedCurrency.toUpperCase() as "USD" | "VTN" | "CREDITS", 
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

        toast({
          title: "Exchange & Send Completed! ✨",
          description: `Converted and sent ${formatCurrency(result.netAmount, exchangedCurrency)}`,
          duration: 6000
        });
      }

    } catch (error) {
      console.error('Exchange and send error:', error);
      setIsCompleted(false); // Reset on error so user can retry
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to complete exchange and send",
        variant: "destructive"
      });
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
    const currentBalance = walletGetBalance((currency || '').toUpperCase() as 'USD' | 'VTN' | 'CREDITS');
    const canPay = canAfford(amount, currency);
    const effectiveStatus = isCompleted ? 'completed' : status;

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
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>Your balance:</span>
              <span className="flex items-center gap-1">
                {getCurrencyIcon(currency)}
                {currentBalance.toLocaleString()}
              </span>
            </div>
          )}

          {/* Action buttons for recipient */}
          {!isCurrentUser && effectiveStatus === 'pending' && (
            <div className="flex gap-2">
              <Button 
                onClick={handlePaymentAccept}
                disabled={loading || !canPay || isProcessing}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : loading ? 'Checking...' : canPay ? 'Accept' : 'Insufficient Balance'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePaymentDecline}
                disabled={isProcessing}
                className="flex-1"
                size="sm"
              >
                Decline
              </Button>
            </div>
          )}

          {/* Insufficient balance warning */}
          {!isCurrentUser && effectiveStatus === 'pending' && !loading && !canPay && (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span>Insufficient {currency} balance</span>
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
    
    const effectiveStatus = isCompleted ? 'completed' : status;

    return (
      <Card className={`${getStatusColor(effectiveStatus)} max-w-sm`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Exchange & Send</span>
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
                disabled={!canAfford(originalAmount, originalCurrency) || isProcessing}
                className="flex-1"
                size="sm"
              >
                {isProcessing ? 'Processing...' : 'Accept Exchange'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePaymentDecline}
                disabled={isProcessing}
                className="flex-1"
                size="sm"
              >
                Decline
              </Button>
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
            <span className="font-medium text-green-800">Payment Completed</span>
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
            <span>ID: {transactionId}</span>
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