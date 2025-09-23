import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { useWalletRealtime } from './useWalletRealtime';

export interface UserBalance {
  currency_type: 'USD' | 'VTN' | 'CREDITS';
  balance: number;
  updated_at: string;
}

export interface TransactionData {
  id: string;
  transaction_type: 'transfer' | 'exchange' | 'reward' | 'purchase';
  from_currency?: string;
  to_currency?: string;
  amount: number;
  exchange_rate?: number;
  fees: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  from_user_id?: string;
  to_user_id?: string;
}

export function useWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user balances
  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initialize user wallet if it doesn't exist
      await supabase.rpc('initialize_user_wallet', { user_id_param: user.id });

      // Fetch current balances
      const { data, error } = await supabase
        .from('user_wallets')
        .select('currency_type, balance, updated_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setBalances((data as UserBalance[]) || []);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    }
  };

  // Fetch user transactions
  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions((data as TransactionData[]) || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  };

  // Get balance for specific currency
  const getBalance = (currency: 'USD' | 'VTN' | 'CREDITS'): number => {
    const normalizedCurrency = currency.toUpperCase();
    const balance = balances.find(b => b.currency_type === normalizedCurrency);
    return balance ? Number(balance.balance) : 0; // Return 0 instead of 1000 for accurate balance checking
  };

  // Update balance for specific currency
  const updateBalance = async (
    currency: 'USD' | 'VTN' | 'CREDITS',
    amount: number,
    operation: 'add' | 'subtract' = 'add'
  ): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Normalize currency to uppercase
      const normalizedCurrency = currency.toUpperCase();

      const { data, error } = await supabase.rpc('update_user_balance', {
        user_id_param: user.id,
        currency_param: normalizedCurrency,
        amount_param: amount,
        operation: operation
      });

      if (error) throw error;

      // Refresh balances
      await fetchBalances();
      
      return data;
    } catch (err) {
      console.error('Error updating balance:', err);
      toast({
        title: 'Balance Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update balance',
        variant: 'destructive'
      });
      throw err;
    }
  };

  // Process exchange transaction
  const exchangeCurrency = async (
    fromCurrency: 'USD' | 'VTN' | 'CREDITS',
    toCurrency: 'USD' | 'VTN' | 'CREDITS',
    amount: number,
    exchangeRate: number
  ): Promise<any> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Normalize currency to uppercase
      const normalizedFromCurrency = fromCurrency.toUpperCase();
      const normalizedToCurrency = toCurrency.toUpperCase();

      // Use atomic exchange RPC
      const { data, error } = await supabase.rpc('process_wallet_exchange', {
        p_user_id: user.id,
        p_from_currency: normalizedFromCurrency,
        p_to_currency: normalizedToCurrency,
        p_amount: amount,
        p_exchange_rate: exchangeRate
      });

      if (error) throw error;

      const result = data[0];
      const convertedAmount = amount * exchangeRate;

      toast({
        title: 'Exchange Completed! ✅',
        description: `Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency} (No fees!)`,
        duration: 5000
      });
      
      // Refresh data
      await Promise.all([fetchBalances(), fetchTransactions()]);
      
      return {
        id: result.transaction_id,
        from_balance: result.from_balance,
        to_balance: result.to_balance
      };
    } catch (err) {
      console.error('Error processing exchange:', err);
      toast({
        title: 'Exchange Failed',
        description: err instanceof Error ? err.message : 'Exchange transaction failed',
        variant: 'destructive'
      });
      throw err;
    }
  };

  // Transfer funds to another user
  const transferFunds = async (
    toUserId: string,
    currency: 'USD' | 'VTN' | 'CREDITS',
    amount: number
  ): Promise<any> => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase.rpc('process_wallet_transfer', {
        p_from_user_id: user.id,
        p_to_user_id: toUserId,
        p_currency: currency.toUpperCase(),
        p_amount: amount
      });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        toast({
          title: "Transfer Successful! 💸",
          description: `${amount.toLocaleString()} ${currency} sent successfully`
        });
        
        // Refresh data to show updated balances
        await refreshData();
        
        return {
          id: result.transaction_id,
          fromBalance: result.from_balance,
          toBalance: result.to_balance
        };
      }
      
      return null;
    } catch (error) {
      console.error('Transfer error:', error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return null;
    }
  };

  // Atomic exchange and send operation
  const exchangeAndSend = async (
    toUserId: string,
    fromCurrency: "USD" | "VTN" | "CREDITS",
    toCurrency: "USD" | "VTN" | "CREDITS",
    amount: number,
    exchangeRate: number
  ) => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase.rpc('process_wallet_exchange_and_send', {
        p_from_user_id: user.id,
        p_to_user_id: toUserId,
        p_from_currency: fromCurrency.toUpperCase(),
        p_to_currency: toCurrency.toUpperCase(),
        p_amount: amount,
        p_exchange_rate: exchangeRate
      });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        toast({
          title: "Exchange & Send Successful! ✨",
          description: `Converted and sent ${result.net_converted_amount.toLocaleString()} ${toCurrency}`,
          duration: 6000
        });
        
        // Refresh data to show updated balances
        await refreshData();
        
        return {
          exchangeTransactionId: result.exchange_transaction_id,
          transferTransactionId: result.transfer_transaction_id,
          fromBalance: result.from_balance,
          toBalance: result.to_balance,
          netAmount: result.net_converted_amount
        };
      }
      
      return null;
    } catch (error) {
      console.error('Exchange and send error:', error);
      toast({
        title: "Exchange & Send Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      return null;
    }
  };

  // Subscribe to real-time balance updates
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchBalances(), fetchTransactions()]);
      setLoading(false);

      // Set up real-time subscription for balance changes
      if (user?.id) {
        const channel = supabase
          .channel('wallet-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_wallets',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('🔄 Wallet balance changed:', payload);
              fetchBalances();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallet_transactions',
              filter: `from_user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('💸 Outgoing transaction:', payload);
              Promise.all([fetchTransactions(), fetchBalances()]);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallet_transactions',
              filter: `to_user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('💰 Incoming transaction:', payload);
              Promise.all([fetchTransactions(), fetchBalances()]);
            }
          )
          .subscribe((status) => {
            console.log('📡 Wallet subscription status:', status);
          });

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    initializeData();
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchBalances(),
        fetchTransactions()
      ]);
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchBalances, fetchTransactions]);

  // Setup real-time subscriptions
  useWalletRealtime({
    onBalanceUpdate: fetchBalances,
    onTransactionUpdate: fetchTransactions,
  });

  return {
    balances,
    transactions,
    loading,
    error,
    getBalance,
    updateBalance,
    exchangeCurrency,
    transferFunds,
    exchangeAndSend,
    refreshData
  };
}