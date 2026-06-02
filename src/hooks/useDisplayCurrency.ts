import { useCallback, useEffect, useState } from 'react';
import type { DisplayCurrency } from '@/lib/exchangeRates';

const STORAGE_KEY = 'vitana.wallet.displayCurrency';
// Custom event so all hook instances in the same tab stay in sync; the native
// `storage` event only fires across tabs.
const SYNC_EVENT = 'vitana:display-currency';

const read = (): DisplayCurrency => {
  if (typeof window === 'undefined') return 'USD';
  return window.localStorage.getItem(STORAGE_KEY) === 'EUR' ? 'EUR' : 'USD';
};

/**
 * Persisted, tab-wide cash display currency for the wallet (USD ↔ EUR).
 * Balances are stored in USD; this only controls how they are presented.
 */
export function useDisplayCurrency() {
  const [displayCurrency, setState] = useState<DisplayCurrency>(read);

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setDisplayCurrency = useCallback((next: DisplayCurrency) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(SYNC_EVENT));
    setState(next);
  }, []);

  const toggleDisplayCurrency = useCallback(() => {
    setDisplayCurrency(read() === 'EUR' ? 'USD' : 'EUR');
  }, [setDisplayCurrency]);

  return { displayCurrency, setDisplayCurrency, toggleDisplayCurrency };
}
