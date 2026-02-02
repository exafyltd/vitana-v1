import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { isTabVisible } from '@/utils/realtimeDebounce';

interface UseWalletRealtimeProps {
  onBalanceUpdate: () => void;
  onTransactionUpdate: () => void;
}

export function useWalletRealtime({ onBalanceUpdate, onTransactionUpdate }: UseWalletRealtimeProps) {
  const { user } = useAuth();
  
  // Debounce timers
  const balanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transactionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced callbacks (2s delay)
  const debouncedBalanceUpdate = useCallback(() => {
    if (balanceTimerRef.current) {
      clearTimeout(balanceTimerRef.current);
    }
    balanceTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        onBalanceUpdate();
      }
      balanceTimerRef.current = null;
    }, 2000);
  }, [onBalanceUpdate]);

  const debouncedTransactionUpdate = useCallback(() => {
    if (transactionTimerRef.current) {
      clearTimeout(transactionTimerRef.current);
    }
    transactionTimerRef.current = setTimeout(() => {
      if (isTabVisible()) {
        onTransactionUpdate();
      }
      transactionTimerRef.current = null;
    }, 2000);
  }, [onTransactionUpdate]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to wallet balance changes
    const balanceChannel = supabase
      .channel('wallet-balances')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only UPDATE, not *
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Balance updated:', payload);
          debouncedBalanceUpdate();
        }
      )
      .subscribe();

    // Subscribe to transaction changes - only INSERT for new transactions
    const transactionChannel = supabase
      .channel('wallet-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only INSERT, not * (we only care about new transactions)
          schema: 'public',
          table: 'wallet_transactions',
          filter: `or(from_user_id.eq.${user.id},to_user_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          debouncedTransactionUpdate();
        }
      )
      .subscribe();

    return () => {
      // Clean up timers
      if (balanceTimerRef.current) clearTimeout(balanceTimerRef.current);
      if (transactionTimerRef.current) clearTimeout(transactionTimerRef.current);
      
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user?.id, debouncedBalanceUpdate, debouncedTransactionUpdate]);
}
