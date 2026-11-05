/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the wallet
 * calls the chat's payment surfaces make (attachment menu Send Funds / Request
 * Payment, the payment cards' Pay / Accept), native twin of the parts of web
 * `src/hooks/useWallet.ts` they use (class B):
 *
 *  - balances: `user_wallets` (currency_type, balance) of the member; an empty
 *    wallet is initialised once (`initialize_user_wallet`) and read again;
 *  - transferFunds: `process_wallet_transfer` (p_from_user_id, p_to_user_id,
 *    p_currency, p_amount) → { id, fromBalance, toBalance } ("Transfer
 *    successful" / "Transfer failed" toasts as on the web);
 *  - exchangeAndSend: `process_wallet_exchange_and_send`.
 * The currencies offered are the web's CURRENCY_CONFIGS (USD, VTNA Credits).
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { notify, notifyError } from '../../../ports/ui';

export type Currency = 'USD' | 'VTNA' | 'CREDITS';
export const CURRENCIES: Array<{ value: Currency; fullLabel: string }> = [
  { value: 'USD', fullLabel: 'US Dollars' },
  { value: 'CREDITS', fullLabel: 'VTNA Credits' },
];

export interface Balance {
  currency_type: string;
  balance: number | string;
}

async function fetchBalances(userId: string): Promise<Balance[]> {
  const supabase = getSupabase();
  const read = async () => {
    const { data, error } = await supabase.from('user_wallets').select('currency_type, balance, updated_at').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []) as Balance[];
  };
  let rows = await read();
  if (rows.length === 0) {
    await supabase.rpc('initialize_user_wallet', { user_id_param: userId } as never);
    rows = await read();
  }
  return rows;
}

export function balanceOf(balances: Balance[] | undefined, currency: string): number | null {
  const entry = (balances ?? []).find((b) => b.currency_type === currency.toUpperCase());
  if (!entry) return null;
  const n = Number(entry.balance);
  return Number.isFinite(n) ? n : null;
}

export function useWallet(userId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const key = ['chat-wallet', userId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => fetchBalances(userId as string), enabled: enabled && !!userId, staleTime: 30_000 });

  const getBalance = useCallback((currency: string) => balanceOf(query.data, currency), [query.data]);

  const transferFunds = useCallback(
    async (toUserId: string, currency: Currency, amount: number): Promise<{ id: string; fromBalance: number; toBalance: number } | null> => {
      if (!userId) return null;
      notify('toasts.hooks.transferSuccessful');
      try {
        const { data, error } = await getSupabase().rpc('process_wallet_transfer', {
          p_from_user_id: userId,
          p_to_user_id: toUserId,
          p_currency: currency.toUpperCase(),
          p_amount: amount,
        } as never);
        if (error) throw error;
        const result = (data as Array<{ transaction_id: string; from_balance: number; to_balance: number }> | null)?.[0];
        void queryClient.invalidateQueries({ queryKey: key });
        return result ? { id: result.transaction_id, fromBalance: result.from_balance, toBalance: result.to_balance } : null;
      } catch {
        notifyError('toasts.hooks.transferFailed');
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, queryClient],
  );

  const exchangeAndSend = useCallback(
    async (toUserId: string, fromCurrency: Currency, toCurrency: Currency, amount: number, exchangeRate: number) => {
      if (!userId) return null;
      const { data, error } = await getSupabase().rpc('process_wallet_exchange_and_send', {
        p_from_user_id: userId,
        p_to_user_id: toUserId,
        p_from_currency: fromCurrency.toUpperCase(),
        p_to_currency: toCurrency.toUpperCase(),
        p_amount: amount,
        p_exchange_rate: exchangeRate,
      } as never);
      if (error) throw error;
      const r = (data as Array<{ exchange_transaction_id: string; transfer_transaction_id: string; net_amount: number }> | null)?.[0];
      void queryClient.invalidateQueries({ queryKey: key });
      return r ? { exchangeTransactionId: r.exchange_transaction_id, transferTransactionId: r.transfer_transaction_id, netAmount: r.net_amount } : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, queryClient],
  );

  return { balances: query.data, loading: query.isLoading, error: query.error, getBalance, transferFunds, exchangeAndSend, refresh: query.refetch };
}
