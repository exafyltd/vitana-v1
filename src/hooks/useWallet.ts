import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    const balance = balances.find(b => b.currency_type === currency);
    return balance ? Number(balance.balance) : 1000; // Default balance
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

      const { data, error } = await supabase.rpc('update_user_balance', {
        user_id_param: user.id,
        currency_param: currency,
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
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fees = amount * 0.01; // 1% fee
      const toAmount = (amount - fees) * exchangeRate;

      // Start transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: user.id,
          transaction_type: 'exchange',
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: amount,
          exchange_rate: exchangeRate,
          fees: fees,
          status: 'pending'
        });

      if (transactionError) throw transactionError;

      // Update balances
      await updateBalance(fromCurrency, amount, 'subtract');
      await updateBalance(toCurrency, toAmount, 'add');

      // Refresh data
      await Promise.all([fetchBalances(), fetchTransactions()]);

      toast({
        title: 'Exchange Completed! ✅',
        description: `Converted ${amount} ${fromCurrency} to ${toAmount.toFixed(2)} ${toCurrency}`,
        duration: 5000
      });
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
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fees = amount * 0.005; // 0.5% transfer fee
      const transferAmount = amount - fees;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          transaction_type: 'transfer',
          from_currency: currency,
          to_currency: currency,
          amount: amount,
          fees: fees,
          status: 'pending'
        });

      if (transactionError) throw transactionError;

      // Update sender balance
      await updateBalance(currency, amount, 'subtract');

      // Refresh data
      await Promise.all([fetchBalances(), fetchTransactions()]);

      toast({
        title: 'Transfer Initiated ✅',
        description: `Sent ${transferAmount.toFixed(2)} ${currency} (fee: ${fees.toFixed(2)})`,
        duration: 5000
      });
    } catch (err) {
      console.error('Error processing transfer:', err);
      toast({
        title: 'Transfer Failed',
        description: err instanceof Error ? err.message : 'Transfer failed',
        variant: 'destructive'
      });
      throw err;
    }
  };

  // Subscribe to real-time balance updates
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchBalances(), fetchTransactions()]);
      setLoading(false);

      // Set up real-time subscription for balance changes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
            () => {
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
            () => {
              fetchTransactions();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    initializeData();
  }, []);

  return {
    balances,
    transactions,
    loading,
    error,
    getBalance,
    updateBalance,
    exchangeCurrency,
    transferFunds,
    refreshData: () => Promise.all([fetchBalances(), fetchTransactions()])
  };
}