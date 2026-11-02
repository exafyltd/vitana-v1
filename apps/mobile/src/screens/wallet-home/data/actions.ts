/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the calls the wallet flows
 * make when the member confirms. Each one is the web call on the native
 * clients, with the same endpoint and request shape:
 *  - `createDeposit` / `getDeposit`: the gateway wallet rail of
 *    src/lib/wallet-gateway-client.ts (`POST /api/v1/wallet/deposits/create`
 *    `{ amount_minor, currency }`, `GET /api/v1/wallet/deposits/:id`), sent
 *    like the web `communityFetch` (Bearer token, `X-Vitana-Active-Role:
 *    community`, JSON body); a non-2xx or `{ ok: false }` answer throws;
 *  - `openCheckout`: the hosted Stripe Checkout page in the system browser
 *    (expo-web-browser), where the web assigns `window.location`;
 *  - `updateBalance` / `exchangeCurrency` / `transferFunds`: the Supabase
 *    RPCs of src/hooks/useWallet.ts (`update_user_balance`,
 *    `process_wallet_exchange`, `process_wallet_transfer`) with the same
 *    parameter names;
 *  - `sendMessage`: the `messages` insert of src/hooks/useMessages.ts;
 *  - `logActivity`: the `user_activity_log` insert of
 *    src/hooks/useActivityLogger.ts;
 *  - `searchMembers`: the `global_community_profiles` read of
 *    src/hooks/useCommunityMembers.ts (recipient search of Send);
 *  - `wait`: the web popups' simulated processing delays (withdraw,
 *    exchange & send) and the deposit poll interval.
 *
 * `liveWalletActions` is the app default. The per-flow handling (validation,
 * toasts, the deposit return leg) is in ./flows.ts. Tests inject fakes
 * through `WalletActionsProvider` or run the default against the fake
 * gateway and the Supabase double; no test calls a live system or Stripe.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { getGateway } from '../../../auth/gateway';
import { getSupabase } from '../../../auth/client';

export type WalletCurrencyCode = 'USD' | 'VTNA' | 'CREDITS';

export type CreateDepositInput = { amount_minor: number; currency: 'EUR' | 'USD' };
export type CreateDepositResponse = { ok: true; deposit_id: string; checkout_url: string; expires_at: string };
export type DepositStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'expired' | 'canceled' | string;
export type Deposit = { id: string; amount_minor: number; currency: 'EUR' | 'USD'; status: DepositStatus; failure_reason: string | null; created_at: string; updated_at: string };
export type GetDepositResponse = { ok: true; deposit: Deposit };

/** The gateway's error for a non-2xx or `{ ok: false }` answer (web `WalletGatewayApiError`). */
export class WalletGatewayApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = 'WalletGatewayApiError';
    this.status = status;
    this.code = code;
  }
}

export type UpdateBalanceInput = {
  userId: string;
  currency: WalletCurrencyCode;
  amount: number;
  operation: 'add' | 'subtract';
  transactionType?: 'transfer' | 'exchange' | 'reward' | 'purchase' | 'withdrawal' | 'stake';
  description?: string;
};
export type ExchangeInput = { userId: string; fromCurrency: WalletCurrencyCode; toCurrency: WalletCurrencyCode; amount: number; exchangeRate: number };
export type ExchangeResult = { id: string; from_balance: number; to_balance: number };
export type TransferInput = { userId: string; toUserId: string; currency: WalletCurrencyCode; amount: number };
export type TransferResult = { id: string; fromBalance: number; toBalance: number };
export type SendMessageInput = {
  senderId: string;
  tenantId: string;
  body: string;
  recipientId?: string;
  messageType: string;
  contentData?: unknown;
  actionButtons?: unknown[];
};
export type ActivityInput = { userId: string; activityType: string; activityData: unknown; contextData?: unknown; dedupeKey?: string };
export type CommunityMember = { user_id: string; display_name: string | null; avatar_url: string | null };

export type WalletActions = {
  createDeposit: (input: CreateDepositInput) => Promise<CreateDepositResponse>;
  getDeposit: (depositId: string) => Promise<GetDepositResponse>;
  openCheckout: (url: string) => Promise<{ closed: boolean }>;
  updateBalance: (input: UpdateBalanceInput) => Promise<unknown>;
  exchangeCurrency: (input: ExchangeInput) => Promise<ExchangeResult>;
  transferFunds: (input: TransferInput) => Promise<TransferResult | null>;
  sendMessage: (input: SendMessageInput) => Promise<void>;
  logActivity: (input: ActivityInput) => Promise<void>;
  searchMembers: (term: string, selfId: string | null) => Promise<CommunityMember[]>;
  wait: (ms: number) => Promise<void>;
};

/** Web `walletGatewayFetch` on the native gateway client (which adds `/api/v1` and the Bearer token). */
async function walletGatewayFetch<T>(path: string, opts: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const headers: Record<string, string> = { 'X-Vitana-Active-Role': 'community' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await getGateway()(path, {
    method: opts.method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let parsed: unknown;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* leave undefined */
    }
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!res.ok || obj?.ok === false) {
    throw new WalletGatewayApiError(res.status, obj && typeof obj.error === 'string' ? obj.error : `http_${res.status}`, text);
  }
  return parsed as T;
}

/**
 * Opens the hosted page in the system browser. iOS resolves when the member
 * closes it (`closed: true`); Android resolves `opened` at once (`closed:
 * false`), and the return leg runs on the next AppState 'active' instead.
 */
async function openCheckout(url: string): Promise<{ closed: boolean }> {
  const result = await WebBrowser.openBrowserAsync(url);
  return { closed: result.type !== 'opened' };
}

let activitySessionId: string | null = null;
/** Web: one `vitana_session_id` per browser session; native: one per app run. */
function sessionId(): string {
  if (!activitySessionId) activitySessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return activitySessionId;
}

/** The app default: the web's calls on the native gateway and Supabase clients. */
export const liveWalletActions: WalletActions = {
  createDeposit: (input) => walletGatewayFetch<CreateDepositResponse>('/wallet/deposits/create', { method: 'POST', body: input }),
  getDeposit: (depositId) => walletGatewayFetch<GetDepositResponse>(`/wallet/deposits/${encodeURIComponent(depositId)}`, { method: 'GET' }),
  openCheckout,
  updateBalance: async ({ userId, currency, amount, operation, transactionType, description }) => {
    const { data, error } = await getSupabase().rpc('update_user_balance', {
      user_id_param: userId,
      currency_param: currency.toUpperCase(),
      amount_param: amount,
      operation,
      p_transaction_type: transactionType ?? null,
      p_description: description ?? null,
    });
    if (error) throw new Error(error.message);
    return data;
  },
  exchangeCurrency: async ({ userId, fromCurrency, toCurrency, amount, exchangeRate }) => {
    const { data, error } = await getSupabase().rpc('process_wallet_exchange', {
      p_user_id: userId,
      p_from_currency: fromCurrency.toUpperCase(),
      p_to_currency: toCurrency.toUpperCase(),
      p_amount: amount,
      p_exchange_rate: exchangeRate,
    });
    if (error) throw new Error(error.message);
    const row = (data as Array<{ transaction_id: string; from_balance: number; to_balance: number }>)[0];
    return { id: row.transaction_id, from_balance: row.from_balance, to_balance: row.to_balance };
  },
  transferFunds: async ({ userId, toUserId, currency, amount }) => {
    const { data, error } = await getSupabase().rpc('process_wallet_transfer', {
      p_from_user_id: userId,
      p_to_user_id: toUserId,
      p_currency: currency.toUpperCase(),
      p_amount: amount,
    });
    if (error) throw new Error(error.message);
    const row = (data as Array<{ transaction_id: string; from_balance: number; to_balance: number }> | null)?.[0];
    return row ? { id: row.transaction_id, fromBalance: row.from_balance, toBalance: row.to_balance } : null;
  },
  sendMessage: async ({ senderId, tenantId, body, recipientId, messageType, contentData, actionButtons }) => {
    const { error } = await getSupabase()
      .from('messages')
      .insert([
        {
          body,
          sender_id: senderId,
          recipient_id: recipientId || null,
          thread_id: null,
          tenant_id: tenantId,
          message_type: messageType,
          content_data: contentData || null,
          workflow_type: null,
          action_buttons: actionButtons || null,
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
  },
  logActivity: async ({ userId, activityType, activityData, contextData = {}, dedupeKey }) => {
    try {
      await getSupabase().from('user_activity_log').insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        context_data: contextData,
        dedupe_key: dedupeKey,
        session_id: sessionId(),
      });
    } catch {
      /* web: logged to the console only */
    }
  },
  searchMembers: async (term, selfId) => {
    let query = getSupabase().from('global_community_profiles').select('user_id, display_name, avatar_url').eq('is_visible', true);
    if (term.trim()) query = query.ilike('display_name', `%${term.trim()}%`);
    const { data, error } = await query.order('display_name', { ascending: true }).limit(20);
    if (error) throw new Error(error.message);
    return ((data as CommunityMember[] | null) ?? []).filter((p) => !selfId || p.user_id !== selfId);
  },
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const WalletActionsContext = createContext<WalletActions>(liveWalletActions);

export function WalletActionsProvider({ value, children }: { value: WalletActions; children: ReactNode }): ReactElement {
  return createElement(WalletActionsContext.Provider, { value }, children);
}

export function useWalletActions(): WalletActions {
  return useContext(WalletActionsContext);
}
