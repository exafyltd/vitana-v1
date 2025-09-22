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

    // Subscribe to wallet balance changes
    const balanceChannel = supabase
      .channel('wallet-balances')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Balance updated:', payload);
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
      .subscribe();

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('wallet-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `or(from_user_id.eq.${user.id},to_user_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          onTransactionUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user?.id, onBalanceUpdate, onTransactionUpdate, toast]);
}