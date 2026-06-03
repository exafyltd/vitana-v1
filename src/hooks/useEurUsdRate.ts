import { useQuery } from '@tanstack/react-query';
import { EUR_PER_USD } from '@/lib/exchangeRates';

// Live EUR/USD source. Frankfurter serves the ECB's published reference rates,
// is free, keyless and CORS-enabled. Override via VITE_FX_RATES_URL to point at
// a different feed (e.g. an intraday provider proxied through the gateway).
const FX_RATES_URL =
  import.meta.env.VITE_FX_RATES_URL ??
  'https://api.frankfurter.app/latest?from=USD&to=EUR';

async function fetchEurPerUsd(): Promise<number> {
  const res = await fetch(FX_RATES_URL);
  if (!res.ok) throw new Error(`FX request failed: ${res.status}`);
  const data = await res.json();
  const rate = data?.rates?.EUR;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('FX response missing a valid EUR rate');
  }
  return rate;
}

/**
 * Live EUR per 1 USD for the wallet's display toggle.
 *
 * Always returns a usable number: while loading or on failure it falls back to
 * the static EUR_PER_USD. The query key is persisted (see PERSIST_KEYS in
 * main.tsx) so the last-known rate survives a page refresh.
 */
export function useEurUsdRate() {
  const query = useQuery({
    queryKey: ['fx-rate', 'usd-eur'],
    queryFn: fetchEurPerUsd,
    staleTime: 60 * 60 * 1000, // 1h — reference rates update at most daily
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  return {
    eurPerUsd: query.data ?? EUR_PER_USD,
    isLive: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
