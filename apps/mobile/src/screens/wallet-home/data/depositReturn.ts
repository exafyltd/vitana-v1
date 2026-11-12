/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the hub's side of the Stripe
 * deposit return leg (web Wallet.tsx `depositId` / `depositResult`; the
 * polling and toasts are in ./flows.ts `resumePendingDeposit`):
 *  - on AppState 'active' and on screen focus, a pending deposit (marked when
 *    the checkout was opened) is read again and the wallet refetched;
 *  - the web's return params, if the link reaches the app: `depositResult=
 *    canceled` shows `toasts.wallet.depositCanceled`; `depositResult=success`
 *    marks the deposit pending and runs the return leg. Both clear the params
 *    afterwards, as the web does.
 */
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { notifyError } from '../../../ports/ui';
import { useWalletActions } from './actions';
import { resumePendingDeposit, setPendingDeposit } from './flows';
import { useWalletRefresh } from './wallet';

export function useDepositReturnLeg(params: { depositId?: string; depositResult?: string }): void {
  const actions = useWalletActions();
  const refresh = useWalletRefresh();
  const resume = useCallback(() => void resumePendingDeposit(actions, refresh), [actions, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') resume();
    });
    return () => sub.remove();
  }, [resume]);

  useFocusEffect(resume);

  const { depositId, depositResult } = params;
  useEffect(() => {
    if (!depositId) return;
    if (depositResult === 'canceled') {
      notifyError('toasts.wallet.depositCanceled');
    } else if (depositResult === 'success') {
      setPendingDeposit(depositId);
      resume();
    } else {
      return;
    }
    router.setParams({ depositId: undefined, depositResult: undefined });
  }, [depositId, depositResult, resume]);
}
