/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — native twin of the read side
 * of the web `useWallet` (src/hooks/useWallet.ts). Same PostgREST reads, same
 * columns, same `getBalance` / `isLoaded` semantics, RE-IMPLEMENTED against
 * the injected native Supabase client (`getSupabase()`) — NOT imported from
 * `@vitana/core` (the web hook is class B: it imports
 * `@/integrations/supabase/client`).
 *
 * Read only. Deliberately not carried over (no write or money movement from
 * this lane — owner instruction for VTID-05422):
 *  - `initialize_user_wallet` (the web RPC that creates the rows on a first
 *    visit): a member without rows sees the loading label, as the web does
 *    until its init completes;
 *  - `updateBalance` / `exchangeCurrency` / `transferFunds` /
 *    `exchangeAndSend` (the `update_user_balance` / `process_wallet_*` RPCs):
 *    the native flows hand their request to `WalletActions` (./actions.ts);
 *  - the realtime channel and the last-good-balances localStorage cache: the
 *    native hub relies on react-query's cache and `refreshData()`.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';

export type WalletCurrency = 'USD' | 'VTNA' | 'CREDITS';

export interface UserBalance {
  currency_type: WalletCurrency;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  transaction_type: 'transfer' | 'exchange' | 'reward' | 'purchase' | 'withdrawal' | 'stake' | 'reseller_commission';
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
  metadata?: Record<string, unknown> | null;
}

/** Web: only auth / permission failures surface as `error`; timeouts and fetch errors are silent. */
function criticalMessage(err: unknown): string | null {
  const message = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : '';
  return message.includes('authenticated') || message.includes('permission') ? message : null;
}

async function fetchBalances(userId: string): Promise<UserBalance[]> {
  const { data, error } = await getSupabase().from('user_wallets').select('currency_type, balance, updated_at').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data as unknown as UserBalance[] | null) ?? [];
}

async function fetchTransactions(userId: string): Promise<WalletTransaction[]> {
  const { data, error } = await getSupabase()
    .from('wallet_transactions')
    .select(
      '*, from_profile:profiles!wallet_transactions_from_user_id_fkey(display_name, avatar_url), to_profile:profiles!wallet_transactions_to_user_id_fkey(display_name, avatar_url)',
    )
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data as unknown as WalletTransaction[] | null) ?? [];
}

export type WalletData = {
  balances: UserBalance[];
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  isLoaded: boolean;
  getBalance: (currency: WalletCurrency) => number | null;
  refreshData: () => void;
};

export function useWallet(): WalletData {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const balancesQuery = useQuery({
    queryKey: ['wallet', 'balances', userId],
    queryFn: () => fetchBalances(userId as string),
    enabled: !!userId,
    retry: false,
  });
  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions', userId],
    queryFn: () => fetchTransactions(userId as string),
    enabled: !!userId,
    retry: false,
  });

  const balances = balancesQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const loading = balancesQuery.isPending || transactionsQuery.isPending;
  const error = criticalMessage(balancesQuery.error) ?? criticalMessage(transactionsQuery.error);

  const getBalance = (currency: WalletCurrency): number | null => {
    const entry = balances.find((b) => b.currency_type === currency.toUpperCase());
    if (!entry) return null;
    const num = Number(entry.balance);
    return Number.isFinite(num) ? num : null;
  };

  return {
    balances,
    transactions,
    loading,
    error,
    // Web: `isLoaded: !loading || balances.length > 0`.
    isLoaded: !loading || balances.length > 0,
    getBalance,
    refreshData: () => {
      void balancesQuery.refetch();
      void transactionsQuery.refetch();
    },
  };
}
