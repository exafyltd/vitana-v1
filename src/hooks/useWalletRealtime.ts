import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';

interface UseWalletRealtimeProps {
  onBalanceUpdate: () => void;
  onTransactionUpdate: () => void;
}

export function useWalletRealtime({ onBalanceUpdate, onTransactionUpdate }: UseWalletRealtimeProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Setting up wallet real-time subscriptions for user:', user.id);

    // Subscribe to wallet balance changes with connection monitoring
    const balanceChannel = supabase
      .channel('wallet-balances-optimized')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💰 Balance updated:', payload);
          onBalanceUpdate();
          
          // Show notification for balance increases (received payments)
          if (payload.new && payload.old) {
            const newBalance = Number(payload.new.balance);
            const oldBalance = Number(payload.old.balance);
            const currency = payload.new.currency_type;
            
            if (newBalance > oldBalance) {
              const increase = newBalance - oldBalance;
              toast({
                title: "💰 Payment Received!",
                description: `+${increase.toLocaleString()} ${currency} added to your wallet`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('💳 Balance subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Balance subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Balance subscription error - attempting reconnect');
          setTimeout(() => {
            balanceChannel.unsubscribe();
          }, 2000);
        }
      });

    // Subscribe to transaction changes with connection monitoring
    const transactionChannel = supabase
      .channel('wallet-transactions-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `or(from_user_id.eq.${user.id},to_user_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('💸 Transaction updated:', payload);
          onTransactionUpdate();
        }
      )
      .subscribe((status) => {
        console.log('💸 Transaction subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Transaction subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Transaction subscription error - attempting reconnect');
          setTimeout(() => {
            transactionChannel.unsubscribe();
          }, 2000);
        }
      });

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user?.id, onBalanceUpdate, onTransactionUpdate, toast]);
}