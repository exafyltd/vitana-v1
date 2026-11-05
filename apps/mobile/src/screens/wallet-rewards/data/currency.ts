/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the shop's money label
 * currency: the read side of the web `useDisplayCurrency`
 * (src/hooks/useDisplayCurrency.ts) and `useEurUsdRate`
 * (src/hooks/useEurUsdRate.ts). Both web hooks are class B (localStorage /
 * window events; a live FX fetch), so they are re-implemented here.
 *
 *  - Display currency: same storage key and default (EUR; an explicit stored
 *    'USD' is respected), read from AsyncStorage. The rewards screen never
 *    changes it (the toggle lives on the wallet hub, lane wallet-home).
 *  - EUR/USD rate: the web falls back to the static `EUR_PER_USD` (0.92,
 *    src/lib/exchangeRates.ts) while its live request loads or fails. This
 *    lane makes no third-party request, so it always uses that fallback. The
 *    constant comes to `@vitana/core` with the wallet-home lane (VTID-05422,
 *    which owns the exchangeRates extraction); until that merges this file
 *    holds the same value.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShopCurrency } from './rewards';

const STORAGE_KEY = 'vitana.wallet.displayCurrency';

/** src/lib/exchangeRates.ts `EUR_PER_USD`. */
export const EUR_PER_USD_FALLBACK = 0.92;

export function useShopCurrency(): ShopCurrency {
  const [currency, setCurrency] = useState<ShopCurrency>('EUR');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active) setCurrency(stored === 'USD' ? 'USD' : 'EUR');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return currency;
}

export function useEurPerUsd(): number {
  return EUR_PER_USD_FALLBACK;
}
