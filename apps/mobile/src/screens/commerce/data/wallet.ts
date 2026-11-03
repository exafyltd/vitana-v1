/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * native twins of `src/hooks/useWalletGateway.ts` + `src/lib/wallet-gateway-client.ts`
 * (class B: `communityFetch` reads the web session). The gateway commerce
 * wallet rail (EUR/USD `wallet_accounts`, Stripe deposits), same calls, keys
 * and polling as the web:
 *
 *   GET  /wallet/balance          ["wallet-gateway","balance"]
 *   POST /wallet/deposits/create  { amount_minor, currency } → Stripe checkout_url
 *   GET  /wallet/deposits/:id     ["wallet-gateway","deposit",id], every 2.5 s
 *                                 until succeeded / failed (pollUntilTerminal)
 *
 * `communityFetch`: signed out throws "Not authenticated" without a request;
 * the active-role header; JSON content type for a body; `{ ok:false }` or a
 * non-2xx → `WalletGatewayApiError`. On a created deposit the web navigates
 * the window to Stripe (`window.location.assign`); natively the hosted
 * checkout opens in the system browser (expo-web-browser), like the voucher.
 * The created `deposit_id` is kept and, once the browser resolves, the
 * balance / cart / budget / deposit queries are invalidated and the return
 * leg runs (./depositReturn.ts: bounded poll, AppState 'active', focus).
 *
 * iOS IAP gate flag (requirements R5, highest priority): the deposit is the
 * `AddMoneyDialog` wallet top-up. Today's behaviour is kept — the web shows
 * it on every platform; the shell's `iapRestricted` (drawer.ts:37-38) hides
 * only the wallet drawer row; gate extension deferred (program decision 5).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { openBrowserAsync } from 'expo-web-browser';
import { getGateway } from '../../../auth/gateway';
import { getAccessToken } from '../../../auth/client';
import { ACTIVE_ROLE_HEADER } from '../../../ports/commerce';
import { markDepositPending, refreshAfterDeposit, requestDepositReturn } from './depositReturn';

export type WalletCurrency = 'EUR' | 'USD';

export interface WalletAccount {
  currency: WalletCurrency;
  balance_minor: number;
  status: string;
  updated_at: string;
}

export interface CreateDepositInput {
  amount_minor: number;
  currency: WalletCurrency;
}

export interface CreateDepositResponse {
  ok: true;
  deposit_id: string;
  checkout_url: string;
  expires_at: string;
}

export type DepositStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'expired' | 'canceled' | string;

export interface Deposit {
  id: string;
  amount_minor: number;
  currency: WalletCurrency;
  status: DepositStatus;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class WalletGatewayApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = 'WalletGatewayApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export const walletGatewayQueryKeys = {
  all: ['wallet-gateway'] as const,
  balance: () => [...walletGatewayQueryKeys.all, 'balance'] as const,
  deposit: (id: string) => [...walletGatewayQueryKeys.all, 'deposit', id] as const,
};

/** useDeposit's refetch interval while the deposit is not terminal. */
export const DEPOSIT_POLL_MS = 2500;

export function isTerminalDepositStatus(status: DepositStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}

async function walletJson<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  const res = await getGateway()(path, { method: opts.method ?? 'GET', body, headers });
  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  const asObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!res.ok || asObj?.ok === false) {
    const code = asObj && typeof asObj.error === 'string' ? asObj.error : `http_${res.status}`;
    throw new WalletGatewayApiError(res.status, code, asObj, text);
  }
  return parsed as T;
}

export const getWalletBalance = () => walletJson<{ ok: true; accounts: WalletAccount[] }>('/wallet/balance');
export const createDeposit = (input: CreateDepositInput) => walletJson<CreateDepositResponse>('/wallet/deposits/create', { method: 'POST', body: input });
export const getDeposit = (id: string) => walletJson<{ ok: true; deposit: Deposit }>(`/wallet/deposits/${encodeURIComponent(id)}`);

const retry = (max: number) => (failureCount: number, error: unknown) => {
  if (error instanceof WalletGatewayApiError && error.status === 401) return false;
  return failureCount < max;
};

export function useWalletBalance(opts?: { enabled?: boolean }) {
  const q = useQuery({ queryKey: walletGatewayQueryKeys.balance(), queryFn: getWalletBalance, enabled: opts?.enabled ?? true, retry: retry(1), staleTime: 30_000 });
  return { accounts: q.data?.accounts ?? [], isLoading: q.isLoading, error: q.error };
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (input: CreateDepositInput) => createDeposit(input),
    onSuccess: async (res) => {
      markDepositPending(res.deposit_id);
      try {
        await openBrowserAsync(res.checkout_url);
      } finally {
        refreshAfterDeposit(qc, res.deposit_id);
        requestDepositReturn();
      }
    },
  });
  return {
    createDeposit: async (input: CreateDepositInput): Promise<CreateDepositResponse> => m.mutateAsync(input),
    isCreating: m.isPending,
  };
}

export function useDeposit(depositId: string | null, opts?: { pollUntilTerminal?: boolean }) {
  const poll = opts?.pollUntilTerminal ?? false;
  const q = useQuery({
    queryKey: walletGatewayQueryKeys.deposit(depositId ?? ''),
    queryFn: () => getDeposit(depositId as string),
    enabled: !!depositId,
    retry: retry(2),
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = query.state.data?.deposit?.status;
      if (status && isTerminalDepositStatus(status)) return false;
      return DEPOSIT_POLL_MS;
    },
  });
  const deposit = q.data?.deposit ?? null;
  return { deposit, isLoading: q.isLoading, isTerminal: deposit ? isTerminalDepositStatus(deposit.status) : false, error: q.error };
}
