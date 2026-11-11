/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * Stripe deposit return leg of the cart's AddMoneyDialog. On the web Stripe
 * returns to `/wallet?depositId=&depositResult=` and Wallet.tsx polls the
 * deposit, toasts the outcome (succeeded → `toasts.wallet.fundsAddedSuccessfully`,
 * failed → `transactionFailed`, canceled → `depositCanceled`) and refreshes
 * the balance. Natively the hosted checkout opens in the system browser, so:
 *
 *  - `useCreateDeposit` keeps the created `deposit_id` (`markDepositPending`)
 *    and, once `openBrowserAsync` resolves, invalidates the balance, cart,
 *    budget and deposit queries and asks for the return leg;
 *  - `useDepositReturnLeg` (the cart screen) runs it then, on AppState
 *    'active' and on screen focus while the deposit is pending: up to
 *    DEPOSIT_RETURN_POLLS reads of `GET /wallet/deposits/:id`, 2.5 s
 *    apart (the webhook lags), refetching balance / cart / budget after each,
 *    stopping at a terminal status (succeeded / failed / canceled / expired).
 *    A deposit still pending after the bound stays pending for the next
 *    return to the app. The poll and the AppState listener are cleared on
 *    unmount; one run at a time.
 *  - `useDepositReturnState` exposes the state the balance card renders
 *    (Confirming payment / Balance topped up / Top-up failed / Deposit canceled).
 *
 * Mirrors the wallet-home lane's return leg (screens/wallet-home/data/
 * depositReturn.ts + flows.ts) inside this lane's paths.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { notify, notifyError, universalCartQueryKeys } from '../../../ports/commerce';
// wallet.ts imports this module, so its values are only read inside functions here.
import { getDeposit, walletGatewayQueryKeys, type DepositStatus } from './wallet';

export const DEPOSIT_RETURN_POLLS = 8;
/** Same spacing as wallet.ts DEPOSIT_POLL_MS (the web's useDeposit refetch interval). */
export const DEPOSIT_RETURN_POLL_MS = 2500;
/** The poll bound and spacing (tests shorten `ms`). */
export const depositReturnTiming = { polls: DEPOSIT_RETURN_POLLS, ms: DEPOSIT_RETURN_POLL_MS };

export type DepositReturnStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';
export type DepositReturn = { depositId: string; status: DepositReturnStatus } | null;

let current: DepositReturn = null;
const stateListeners = new Set<() => void>();
const returnListeners = new Set<() => void>();

function setCurrent(next: DepositReturn): void {
  current = next;
  stateListeners.forEach((l) => l());
}

export function getDepositReturn(): DepositReturn {
  return current;
}

export function markDepositPending(depositId: string): void {
  setCurrent({ depositId, status: 'pending' });
}

/** Called when the hosted checkout closes: the mounted return leg resumes. */
export function requestDepositReturn(): void {
  returnListeners.forEach((l) => l());
}

export function __resetDepositReturnForTests(): void {
  current = null;
  stateListeners.clear();
  returnListeners.clear();
  depositReturnTiming.polls = DEPOSIT_RETURN_POLLS;
  depositReturnTiming.ms = DEPOSIT_RETURN_POLL_MS;
}

function outcomeOf(status: DepositStatus): Exclude<DepositReturnStatus, 'pending'> | null {
  if (status === 'succeeded') return 'succeeded';
  if (status === 'failed') return 'failed';
  if (status === 'canceled' || status === 'expired') return 'canceled';
  return null;
}

/** Invalidates (and so refetches the active) balance, cart, budget and, if given, deposit queries. */
export function refreshAfterDeposit(qc: QueryClient, depositId?: string | null): void {
  void qc.invalidateQueries({ queryKey: walletGatewayQueryKeys.balance() });
  void qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });
  void qc.invalidateQueries({ queryKey: universalCartQueryKeys.budget() });
  if (depositId) void qc.invalidateQueries({ queryKey: walletGatewayQueryKeys.deposit(depositId) });
}

const subscribeState = (l: () => void) => {
  stateListeners.add(l);
  return () => void stateListeners.delete(l);
};

export function useDepositReturnState(): DepositReturn {
  return useSyncExternalStore(subscribeState, getDepositReturn, getDepositReturn);
}

export function useDepositReturnLeg(): void {
  const qc = useQueryClient();
  const run = useRef<{ cancel: () => void } | null>(null);

  const resume = useCallback(() => {
    const pending = getDepositReturn();
    if (!pending || pending.status !== 'pending' || run.current) return;
    const { depositId } = pending;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handle = {
      cancel: () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      },
    };
    run.current = handle;
    const wait = (ms: number) => new Promise<void>((r) => (timer = setTimeout(r, ms)));
    const settle = async () => {
      for (let i = 0; i < depositReturnTiming.polls; i++) {
        if (i > 0) await wait(depositReturnTiming.ms);
        if (cancelled) return;
        let status: DepositStatus;
        try {
          const res = await qc.fetchQuery({ queryKey: walletGatewayQueryKeys.deposit(depositId), queryFn: () => getDeposit(depositId), staleTime: 0, retry: false });
          status = res.deposit.status;
        } catch {
          continue;
        }
        if (cancelled) return;
        refreshAfterDeposit(qc);
        const outcome = outcomeOf(status);
        if (!outcome) continue;
        if (getDepositReturn()?.depositId === depositId) setCurrent({ depositId, status: outcome });
        if (outcome === 'succeeded') notify('toasts.wallet.fundsAddedSuccessfully');
        else if (outcome === 'failed') notifyError('toasts.wallet.transactionFailed');
        else notifyError('toasts.wallet.depositCanceled');
        return;
      }
    };
    void settle().finally(() => {
      if (run.current === handle) run.current = null;
    });
  }, [qc]);

  useEffect(() => {
    returnListeners.add(resume);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (getDepositReturn()?.status === 'pending') refreshAfterDeposit(qc, getDepositReturn()?.depositId);
        resume();
      }
    });
    return () => {
      returnListeners.delete(resume);
      sub.remove();
      run.current?.cancel();
      run.current = null;
    };
  }, [qc, resume]);

  useFocusEffect(resume);
}
