/**
 * Marketplace money loop — useWalletGateway hooks.
 *
 * TanStack Query v5 hooks over the NEW gateway commerce-wallet rail
 * (`/api/v1/wallet/*`). This is the wallet used for ALL marketplace commerce
 * money (`wallet_accounts`, EUR/USD, Stripe deposits). It is ADDITIVE and does
 * NOT read, write, or invalidate the legacy `useWallet` / `user_wallets` cache.
 *
 * Mirrors useUniversalCart's structure: a centralized query-key object, typed
 * errors surfaced via WalletGatewayApiError, and a deposit-create mutation that
 * redirects the browser to the Stripe checkout URL on success.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CreateDepositInput,
  Deposit,
  GetDepositResponse,
  WalletAccount,
  WalletGatewayApiError,
  createDeposit as apiCreateDeposit,
  getDeposit as apiGetDeposit,
  getWalletBalance as apiGetWalletBalance,
  isTerminalDepositStatus,
} from "@/lib/wallet-gateway-client";

// Centralized React Query keys so other code can read the same cache. Kept
// separate from `universalCartQueryKeys` so cart invalidation never touches
// wallet balance and vice versa.
export const walletGatewayQueryKeys = {
  all: ["wallet-gateway"] as const,
  balance: () => [...walletGatewayQueryKeys.all, "balance"] as const,
  deposit: (id: string) =>
    [...walletGatewayQueryKeys.all, "deposit", id] as const,
};

export interface UseWalletBalanceReturn {
  accounts: WalletAccount[];
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

/** GET /api/v1/wallet/balance — EUR/USD wallet_accounts balances. */
export function useWalletBalance(opts?: { enabled?: boolean }): UseWalletBalanceReturn {
  const query = useQuery({
    queryKey: walletGatewayQueryKeys.balance(),
    queryFn: () => apiGetWalletBalance(),
    enabled: opts?.enabled ?? true,
    retry: (failureCount, error) => {
      if (error instanceof WalletGatewayApiError && error.status === 401) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30 * 1000,
  });

  return {
    accounts: query.data?.accounts ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refresh: async () => {
      await query.refetch();
    },
  };
}

export interface UseCreateDepositReturn {
  createDeposit: (input: CreateDepositInput) => Promise<void>;
  isCreating: boolean;
  error: unknown;
}

/**
 * POST /api/v1/wallet/deposits/create. On success the browser is redirected to
 * the returned Stripe `checkout_url`.
 */
export function useCreateDeposit(): UseCreateDepositReturn {
  const mutation = useMutation({
    mutationFn: (input: CreateDepositInput) => apiCreateDeposit(input),
    onSuccess: (res) => {
      window.location.assign(res.checkout_url);
    },
  });

  return {
    createDeposit: async (input) => {
      await mutation.mutateAsync(input);
    },
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

export interface UseDepositReturn {
  deposit: Deposit | null;
  isLoading: boolean;
  isTerminal: boolean;
  error: unknown;
}

/**
 * GET /api/v1/wallet/deposits/:id. When `pollUntilTerminal` is set, the query
 * refetches on an interval until the deposit reaches a terminal state
 * (succeeded / failed) — used on the Stripe return landing.
 */
export function useDeposit(
  depositId: string | null,
  opts?: { pollUntilTerminal?: boolean },
): UseDepositReturn {
  const pollUntilTerminal = opts?.pollUntilTerminal ?? false;

  const query = useQuery<GetDepositResponse>({
    queryKey: walletGatewayQueryKeys.deposit(depositId ?? ""),
    queryFn: () => apiGetDeposit(depositId as string),
    enabled: !!depositId,
    retry: (failureCount, error) => {
      if (error instanceof WalletGatewayApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    refetchInterval: (q) => {
      if (!pollUntilTerminal) return false;
      const status = q.state.data?.deposit?.status;
      if (status && isTerminalDepositStatus(status)) return false;
      return 2500;
    },
  });

  const deposit = query.data?.deposit ?? null;

  return {
    deposit,
    isLoading: query.isLoading,
    isTerminal: deposit ? isTerminalDepositStatus(deposit.status) : false,
    error: query.error,
  };
}
