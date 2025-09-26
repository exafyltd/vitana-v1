import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/context/AuthProvider';

interface UseWalletRealtimeProps {
  onBalanceUpdate: () => void;
  onTransactionUpdate: () => void;
}

export function useWalletRealtime({ onBalanceUpdate, onTransactionUpdate }: UseWalletRealtimeProps) {
  const { user } = useAuth();

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
  }, [user?.id, onBalanceUpdate, onTransactionUpdate]);
}