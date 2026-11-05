/**
 * VTID-05511 — the calls behind the provider booking dialog (the web
 * `BookingPaymentFlow.tsx` that "Book Now" / "Book Appointment" open), each a
 * twin of the web hook it comes from, unchanged:
 *  - balances: `useWallet().getBalance` (src/hooks/useWallet.ts:55-130) —
 *    the member's `user_wallets` rows by currency;
 *  - USD wallet payment: `updateBalance('USD', price, 'subtract')` →
 *    RPC `update_user_balance` (:196-231);
 *  - Credits payment: `exchangeCurrency('CREDITS', 'USD', amount, rate)` →
 *    RPC `process_wallet_exchange` (:233-262);
 *  - the provider confirmation: `useMessages().sendMessage(...)` → a
 *    `messages` insert (src/hooks/useMessages.ts:210-270);
 *  - card payment: Edge Function `stripe-create-booking-checkout`
 *    (BookingPaymentFlow.tsx:144-161); the web opens the returned Stripe URL
 *    in a popup, natively it opens in the system browser.
 * Tests run these against a fake client and assert the built requests; no
 * real payment is ever made.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notify, notifyError } from '../../../ports/ui';
import { useAuth } from '../../../auth/AuthProvider';
import { currentUser, db } from './client';

export type WalletCurrency = 'USD' | 'CREDITS';

export function useWalletBalances() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['wallet-balances', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Array<{ currency_type: string; balance: number | string }>> => {
      const read = () => db().from('user_wallets').select('currency_type, balance, updated_at').eq('user_id', user?.id);
      let result = await read();
      if (result.error) throw result.error;
      let rows = (result.data ?? []) as Array<{ currency_type: string; balance: number | string }>;
      if (!rows.length) {
        // No wallet yet: initialise once, then read again (useWallet.ts:94-104).
        await db().rpc('initialize_user_wallet', { user_id_param: user?.id });
        result = await read();
        if (result.error) throw result.error;
        rows = (result.data ?? []) as Array<{ currency_type: string; balance: number | string }>;
      }
      return rows;
    },
  });
  /** `getBalance(currency)`: the row's balance, null when there is none (useWallet.ts:184-190). */
  const getBalance = (c: WalletCurrency): number | null => {
    const entry = (q.data ?? []).find((b) => b.currency_type === c.toUpperCase());
    if (!entry) return null;
    const num = Number(entry.balance);
    return Number.isFinite(num) ? num : null;
  };
  return { getBalance };
}

export function useBookingCalls() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });

  const updateBalance = async (currency: WalletCurrency, amount: number, operation: 'add' | 'subtract') => {
    const user = await currentUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await db().rpc('update_user_balance', {
      user_id_param: user.id,
      currency_param: currency.toUpperCase(),
      amount_param: amount,
      operation,
      p_transaction_type: null,
      p_description: null,
    });
    if (error) {
      notifyError('toasts.hooks.balanceUpdateFailed');
      throw error;
    }
    refresh();
    return data;
  };

  const exchangeCurrency = async (from: WalletCurrency, to: WalletCurrency, amount: number, rate: number) => {
    const user = await currentUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await db().rpc('process_wallet_exchange', {
      p_user_id: user.id,
      p_from_currency: from.toUpperCase(),
      p_to_currency: to.toUpperCase(),
      p_amount: amount,
      p_exchange_rate: rate,
    });
    if (error) {
      notifyError('toasts.hooks.exchangeFailed');
      throw error;
    }
    notify('toasts.hooks.exchangeCompleted');
    refresh();
    return data;
  };

  const sendMessage = async (content: string, recipientId: string, messageType: string, contentData: unknown) => {
    const user = await currentUser();
    if (!user) throw new Error('User not authenticated');
    const row = {
      body: content,
      sender_id: user.id,
      recipient_id: recipientId || null,
      thread_id: null,
      tenant_id: (user.app_metadata?.active_tenant_id as string | undefined) || 'default',
      message_type: messageType,
      content_data: contentData || null,
      workflow_type: null,
      action_buttons: null,
    };
    const { data, error } = await db().from('messages').insert([row]).select('*').single();
    if (error) {
      notifyError('toasts.hooks.error', 'toasts.hooks.failedSendMessage');
      throw error;
    }
    return data;
  };

  const createBookingCheckout = async (body: Record<string, unknown>): Promise<{ url?: string }> => {
    const user = await currentUser();
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await db().functions.invoke('stripe-create-booking-checkout', { body });
    if (error) throw error;
    return (data ?? {}) as { url?: string };
  };

  return { updateBalance, exchangeCurrency, sendMessage, createBookingCheckout };
}
