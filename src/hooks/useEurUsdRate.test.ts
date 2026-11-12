/**
 * The wallet's live EUR/USD rate (useEurUsdRate).
 *
 * api.frankfurter.app now answers with a 301 to api.frankfurter.dev and no
 * Access-Control-Allow-Origin header, so the browser blocked the request and
 * the wallet always showed the static rate (STAGING-VERIFY run 41300076673,
 * /wallet). The hook must call the frankfurter.dev v1 endpoint directly, parse
 * rates.EUR as before, and keep falling back to EUR_PER_USD on any failure.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useEurUsdRate } from './useEurUsdRate';
import { EUR_PER_USD } from '@/lib/exchangeRates';

const FX_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEurUsdRate', () => {
  it('fetches EUR per 1 USD from api.frankfurter.dev and returns rates.EUR', async () => {
    const fetchMock = mockFetch(200, { amount: 1, base: 'USD', date: '2026-10-31', rates: { EUR: 0.92 } });
    const { result } = renderHook(() => useEurUsdRate(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(FX_URL);
    expect(result.current.eurPerUsd).toBe(0.92);
  });

  it('falls back to EUR_PER_USD when the response has no valid EUR rate', async () => {
    mockFetch(200, { amount: 1, base: 'USD', rates: {} });
    const { result } = renderHook(() => useEurUsdRate(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.eurPerUsd).toBe(EUR_PER_USD);
    expect(result.current.isLive).toBe(false);
  });

  it('falls back to EUR_PER_USD when the request fails', async () => {
    mockFetch(503, { message: 'unavailable' });
    const { result } = renderHook(() => useEurUsdRate(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.eurPerUsd).toBe(EUR_PER_USD);
    expect(result.current.isLive).toBe(false);
  });
});
