/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — native twins of the web
 * `useDisplayCurrency` (src/hooks/useDisplayCurrency.ts) and `useEurUsdRate`
 * (src/hooks/useEurUsdRate.ts). Both web hooks are class B (localStorage /
 * window events; a live FX fetch), so they are re-implemented here.
 *
 *  - Display currency: same storage key, same default (EUR; an explicit
 *    stored 'USD' is respected), persisted in AsyncStorage; every hook
 *    instance stays in sync through one in-memory store (the web's custom
 *    `vitana:display-currency` event).
 *  - EUR/USD rate: the web falls back to the static `EUR_PER_USD` while its
 *    live Frankfurter request loads or fails. The native app makes no
 *    third-party request from this lane, so it always uses that fallback;
 *    a live rate is a later wallet FEAT.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EUR_PER_USD, type DisplayCurrency } from '../../../ports/wallet';

const STORAGE_KEY = 'vitana.wallet.displayCurrency';

let current: DisplayCurrency = 'EUR';
let hydrated = false;
const listeners = new Set<(c: DisplayCurrency) => void>();

function publish(next: DisplayCurrency) {
  current = next;
  listeners.forEach((l) => l(next));
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => publish(stored === 'USD' ? 'USD' : 'EUR'))
    .catch(() => undefined);
}

export function useDisplayCurrency(): { displayCurrency: DisplayCurrency; setDisplayCurrency: (next: DisplayCurrency) => void } {
  const [displayCurrency, setState] = useState<DisplayCurrency>(current);
  useEffect(() => {
    listeners.add(setState);
    hydrate();
    setState(current);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  const setDisplayCurrency = (next: DisplayCurrency) => {
    publish(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };
  return { displayCurrency, setDisplayCurrency };
}

export function useEurUsdRate(): { eurPerUsd: number; isLive: boolean } {
  return { eurPerUsd: EUR_PER_USD, isLive: false };
}

/** Test helper: forget the hydrated value so the next hook reads storage again. */
export function __resetDisplayCurrencyForTests(): void {
  current = 'EUR';
  hydrated = false;
}
