import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthProvider';
import { useWalletRealtime } from './useWalletRealtime';
import { useRealtimeConnection } from './useRealtimeConnection';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import { useRequestDeduplication } from './usePerformanceOptimization';
import { measurePerformance } from '@/utils/performanceLogger';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { notify, notifyError } from '@/lib/i18n-toast';

export interface UserBalance {
  currency_type: 'USD' | 'VTNA' | 'CREDITS';
  balance: number;
  updated_at: string;
}

export interface TransactionData {
  id: string;
  transaction_type: 'transfer' | 'exchange' | 'reward' | 'purchase' | 'reseller_commission';
  from_currency?: string;
  to_currency?: string;
  amount: number;
  exchange_rate?: number;
  fees: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  from_user_id?: string;
  to_user_id?: string;
  from_user_name?: string;
  from_user_avatar?: string;
  to_user_name?: string;
  to_user_avatar?: string;
  metadata?: any;
}

export function useWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { deduplicateRequest } = useRequestDeduplication();
  const { logActivity } = useActivityLogger();
  
  // Background refresh queue
  const backgroundTasks = useRef<Set<Promise<any>>>(new Set());

  // Fetch user balances with deduplication
  const fetchBalances = useCallback(async () => {
    if (!user?.id) return;
    
    return deduplicateRequest('fetchBalances', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Optimistically load last known good balances from cache
      const cacheStr = getLocalStorageItem(user.id, 'wallet', 'lastGoodBalances');
      if (cacheStr) {
        try {
          const cached: UserBalance[] = JSON.parse(cacheStr);
          if (Array.isArray(cached) && cached.length) {
            setBalances(cached);
          }
        } catch {
          console.warn('⚠️ Failed to parse cached balances');
        }
      }

      // Fetch current balances with timeout
      const balancePromise = supabase
        .from('user_wallets')
        .select('currency_type, balance, updated_at')
        .eq('user_id', user.id);

      const balanceTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Balance fetch timeout')), 10000)
      );

      let result: any = await Promise.race([balancePromise, balanceTimeoutPromise]);
      if (result.error) throw result.error;

      let balanceData: UserBalance[] = (result.data as UserBalance[]) || [];

      // If no rows, initialize once then refetch
      if (!balanceData.length) {
        const init = supabase.rpc('initialize_user_wallet', { user_id_param: user.id });
        const initTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Wallet init timeout')), 8000)
        );
        await Promise.race([init, initTimeout]);

        // Refetch balances after init
        result = await Promise.race([balancePromise, balanceTimeoutPromise]);
        if (result.error) throw result.error;
        balanceData = (result.data as UserBalance[]) || [];
      }

      if (balanceData.length) {
        setBalances(balanceData);
        setLocalStorageItem(user.id, 'wallet', 'lastGoodBalances', JSON.stringify(balanceData));
        setError(null); // Clear any previous errors
      }
    } catch (err) {
      console.error('❌ Error fetching balances:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balances';
      
      // Only set critical errors that block operations (like auth failures)
      // Don't show timeout or fetch errors as they don't prevent wallet operations
      if (errorMessage.includes('authenticated') || errorMessage.includes('permission')) {
        setError(errorMessage);
      } else {
        console.warn('Non-critical wallet error (silently handled):', errorMessage);
        // Clear error for non-critical issues to prevent UI warnings
        setError(null);
      }
      // Do not overwrite with zero defaults; keep last known balances
    }
    });
  }, [user?.id, deduplicateRequest]);

  // Fetch user transactions with user profiles and deduplication
  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    
    return deduplicateRequest('fetchTransactions', async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionPromise = supabase
        .from('wallet_transactions')
        .select(`
          *,
          from_profile:profiles!wallet_transactions_from_user_id_fkey(display_name, avatar_url),
          to_profile:profiles!wallet_transactions_to_user_id_fkey(display_name, avatar_url)
        `)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction fetch timeout')), 10000)
      );

      const result = await Promise.race([transactionPromise, timeoutPromise]);
      if (result.error) throw result.error;
      
      // Map the data to include user profile information
      const mappedTransactions = (result.data || []).map((tx: any) => ({
        ...tx,
        from_user_name: tx.from_profile?.display_name || 'Unknown User',
        from_user_avatar: tx.from_profile?.avatar_url,
        to_user_name: tx.to_profile?.display_name || 'Unknown User',
        to_user_avatar: tx.to_profile?.avatar_url,
      }));

      setTransactions(mappedTransactions as TransactionData[]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      
      // Only show critical errors, not timeout/fetch errors
      if (errorMessage.includes('authenticated') || errorMessage.includes('permission')) {
        setError(errorMessage);
      } else {
        console.warn('Non-critical transaction fetch error (silently handled):', errorMessage);
      }
      
      // Set empty transactions to prevent infinite loading  
      setTransactions([]);
    }
    });
  }, [user?.id, deduplicateRequest]);

  const getBalance = (currency: 'USD' | 'VTNA' | 'CREDITS'): number | null => {
    const normalizedCurrency = currency.toUpperCase();
    const entry = balances.find(b => b.currency_type === normalizedCurrency);
    if (!entry) return null;
    const num = Number(entry.balance);
    return Number.isFinite(num) ? num : null;
  };

  // Update balance for specific currency
  const updateBalance = async (
    currency: 'USD' | 'VTNA' | 'CREDITS',
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
      notifyError('toasts.hooks.balanceUpdateFailed');
      throw err;
    }
  };

  // Process exchange transaction
  const exchangeCurrency = async (
    fromCurrency: 'USD' | 'VTNA' | 'CREDITS',
    toCurrency: 'USD' | 'VTNA' | 'CREDITS',
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

      notify('toasts.hooks.exchangeCompleted');
      
      // Log activity
      logActivity({
        activityType: 'wallet.exchange',
        activityData: {
          amount: amount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          exchange_rate: exchangeRate,
          converted_amount: convertedAmount,
          transaction_id: result.transaction_id,
          new_from_balance: result.from_balance,
          new_to_balance: result.to_balance
        },
        contextData: {
          transaction_id: result.transaction_id,
          from_currency: normalizedFromCurrency,
          to_currency: normalizedToCurrency
        },
        dedupeKey: `exchange-${result.transaction_id}`
      });
      
      // Background refresh - don't block user experience
      const refreshTask = Promise.all([fetchBalances(), fetchTransactions()]);
      backgroundTasks.current.add(refreshTask);
      refreshTask.finally(() => backgroundTasks.current.delete(refreshTask));
      
      return {
        id: result.transaction_id,
        from_balance: result.from_balance,
        to_balance: result.to_balance
      };
    } catch (err) {
      console.error('Error processing exchange:', err);
      notifyError('toasts.hooks.exchangeFailed');
      throw err;
    }
  };

  // Transfer funds to another user with optimistic updates
  const transferFunds = async (
    toUserId: string,
    currency: 'USD' | 'VTNA' | 'CREDITS',
    amount: number
  ): Promise<any> => {
    const perf = measurePerformance('transferFunds');
    
    if (!user?.id) return null;
    
    // Optimistic balance update
    const currentBalance = getBalance(currency);
    const optimisticBalance = Math.max(0, currentBalance - amount);
    
    // Update balance immediately for instant feedback
    setBalances(prev => prev.map(b => 
      b.currency_type === currency.toUpperCase() 
        ? { ...b, balance: optimisticBalance }
        : b
    ));
    
    // Show success toast immediately
    notify('toasts.hooks.transferSuccessful');
    
    try {
      // Process actual transfer in background
      const { data, error } = await supabase.rpc('process_wallet_transfer', {
        p_from_user_id: user.id,
        p_to_user_id: toUserId,
        p_currency: currency.toUpperCase(),
        p_amount: amount
      });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        // Update with actual balance from server
        setBalances(prev => prev.map(b => 
          b.currency_type === currency.toUpperCase() 
            ? { ...b, balance: result.from_balance }
            : b
        ));
        
        // Log activity
        logActivity({
          activityType: 'wallet.transfer',
          activityData: {
            amount: amount,
            currency: currency,
            to_user_id: toUserId.substring(0, 8) + '...',
            transaction_id: result.transaction_id,
            new_balance: result.from_balance
          },
          contextData: {
            transaction_id: result.transaction_id,
            from_currency: currency.toUpperCase(),
            to_currency: currency.toUpperCase()
          },
          dedupeKey: `transfer-${result.transaction_id}`
        });
        
        // Background refresh - don't block user experience
        const refreshTask = fetchTransactions();
        backgroundTasks.current.add(refreshTask);
        refreshTask.finally(() => backgroundTasks.current.delete(refreshTask));
        
        perf.end({ currency, amount, success: true });
        
        return {
          id: result.transaction_id,
          fromBalance: result.from_balance,
          toBalance: result.to_balance
        };
      }
      
      perf.end({ currency, amount, success: false });
      return null;
    } catch (error) {
      console.error('Transfer error:', error);
      
      // Rollback optimistic update on error
      setBalances(prev => prev.map(b => 
        b.currency_type === currency.toUpperCase() 
          ? { ...b, balance: currentBalance }
          : b
      ));
      
      notifyError('toasts.hooks.transferFailed');
      
      perf.end({ currency, amount, success: false, error: error.message });
      return null;
    }
  };

  // Atomic exchange and send operation with optimistic updates
  const exchangeAndSend = async (
    toUserId: string,
    fromCurrency: "USD" | "VTNA" | "CREDITS",
    toCurrency: "USD" | "VTNA" | "CREDITS",
    amount: number,
    exchangeRate: number
  ) => {
    if (!user?.id) return null;
    
    // Optimistic balance update
    const currentBalance = getBalance(fromCurrency);
    const optimisticBalance = Math.max(0, currentBalance - amount);
    const convertedAmount = amount * exchangeRate;
    
    // Update balance immediately for instant feedback
    setBalances(prev => prev.map(b => 
      b.currency_type === fromCurrency.toUpperCase() 
        ? { ...b, balance: optimisticBalance }
        : b
    ));
    
    // Show success toast immediately
    notify('toasts.hooks.exchangeSendSuccessful');
    
    try {
      // Process actual exchange and send in background
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
        // Update with actual balance from server
        setBalances(prev => prev.map(b => 
          b.currency_type === fromCurrency.toUpperCase() 
            ? { ...b, balance: result.from_balance }
            : b
        ));
        
        // Log exchange activity
        logActivity({
          activityType: 'wallet.exchange',
          activityData: {
            amount: amount,
            from_currency: fromCurrency,
            to_currency: toCurrency,
            exchange_rate: exchangeRate,
            converted_amount: convertedAmount,
            transaction_id: result.exchange_transaction_id
          },
          contextData: {
            transaction_id: result.exchange_transaction_id,
            from_currency: fromCurrency.toUpperCase(),
            to_currency: toCurrency.toUpperCase()
          },
          dedupeKey: `exchange-${result.exchange_transaction_id}`
        });
        
        // Log transfer activity
        logActivity({
          activityType: 'wallet.transfer',
          activityData: {
            amount: convertedAmount,
            currency: toCurrency,
            to_user_id: toUserId.substring(0, 8) + '...',
            transaction_id: result.transfer_transaction_id
          },
          contextData: {
            transaction_id: result.transfer_transaction_id,
            from_currency: toCurrency.toUpperCase(),
            to_currency: toCurrency.toUpperCase()
          },
          dedupeKey: `transfer-${result.transfer_transaction_id}`
        });
        
        // Background refresh - don't block user experience
        const refreshTask = fetchTransactions();
        backgroundTasks.current.add(refreshTask);
        refreshTask.finally(() => backgroundTasks.current.delete(refreshTask));
        
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
      
      // Rollback optimistic update on error
      setBalances(prev => prev.map(b => 
        b.currency_type === fromCurrency.toUpperCase() 
          ? { ...b, balance: currentBalance }
          : b
      ));
      
      notifyError('toasts.hooks.exchangeSendFailed');
      return null;
    }
  };

  // Initialize wallet data on mount
  useEffect(() => {
    const initializeData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Add overall timeout for initialization
        const initPromise = Promise.all([fetchBalances(), fetchTransactions()]);
        const overallTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Wallet initialization timeout')), 15000)
        );
        
        await Promise.race([initPromise, overallTimeout]);
      } catch (error) {
        console.error('Wallet initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize wallet';
        
        // Only show critical initialization errors
        if (errorMessage.includes('authenticated') || errorMessage.includes('permission')) {
          setError(errorMessage);
        } else {
          console.warn('Non-critical wallet initialization error (silently handled):', errorMessage);
          // Don't block UI for timeout errors during initialization
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Add timeout for refresh operations
      const refreshPromise = Promise.all([
        fetchBalances(),
        fetchTransactions()
      ]);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Refresh timeout')), 12000)
      );
      
      await Promise.race([refreshPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh wallet data';
      
      // Only show critical errors during refresh, not timeout errors
      if (errorMessage.includes('authenticated') || errorMessage.includes('permission')) {
        setError(errorMessage);
      } else {
        console.warn('Non-critical refresh error (silently handled):', errorMessage);
        // Don't update error state for timeout/refresh failures
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Setup real-time subscriptions
  useWalletRealtime({
    onBalanceUpdate: fetchBalances,
    onTransactionUpdate: fetchTransactions,
  });

  // Smart fallback polling when real-time is disconnected
  const { isConnected } = useRealtimeConnection();

  useEffect(() => {
    if (isConnected || !user?.id) return; // Real-time working, no polling needed

    console.warn('⚠️ Real-time disconnected, activating wallet fallback polling');

    // Poll every 10 seconds when disconnected
    const interval = setInterval(() => {
      console.log('🔄 Polling wallet data (fallback mode)');
      fetchBalances();
      fetchTransactions();
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, user?.id, fetchBalances, fetchTransactions]);

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
    refreshData,
    isLoaded: !loading || balances.length > 0
  };
}