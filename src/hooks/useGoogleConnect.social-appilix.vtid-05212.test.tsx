/**
 * VTID-05212 C5 — Instagram / Facebook connect (the E6/E7 cards) inside the
 * Appilix app asks the gateway for the in-app return (`?return=mobile` →
 * /oauth/complete) and gets the bounce overlay + connections poller, as
 * Google and YouTube do. In a browser nothing changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ appilix: false, redirect: vi.fn() }));

vi.mock('@/lib/webview', () => ({
  isAppilixWebView: () => h.appilix,
  redirectViaSystemBrowser: (url: string) => h.redirect(url),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));

import { useStartInstagramConnect, useStartFacebookConnect } from './useGoogleConnect';
import { useOAuthBounceStore } from './useOAuthBounceStore';

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  h.appilix = false;
  h.redirect.mockReset();
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true, auth_url: 'https://provider.example/auth' }) });
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  useOAuthBounceStore.getState().reset();
});

afterEach(() => {
  useOAuthBounceStore.getState().reset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each([
  ['instagram', useStartInstagramConnect],
  ['facebook', useStartFacebookConnect],
] as const)('%s connect', (provider, useStart) => {
  it('in the Appilix app: ?return=mobile, bounce overlay pending, system browser', async () => {
    h.appilix = true;
    const { result } = renderHook(() => useStart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/api/v1/social-accounts/connect/${provider}\\?return=mobile$`));
    expect(useOAuthBounceStore.getState()).toMatchObject({ status: 'pending', provider });
    expect(h.redirect).toHaveBeenCalledWith('https://provider.example/auth');
  });

  it('in a browser: no return=mobile and no overlay', async () => {
    const { result } = renderHook(() => useStart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/api/v1/social-accounts/connect/${provider}$`));
    expect(useOAuthBounceStore.getState().status).toBe('idle');
    expect(h.redirect).toHaveBeenCalledWith('https://provider.example/auth');
  });

  it('in the Appilix app: once the connection shows up the overlay succeeds', async () => {
    h.appilix = true;
    const { result } = renderHook(() => useStart(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ connections: [{ provider, is_active: true }] }) });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await waitFor(() => expect(useOAuthBounceStore.getState().status).toBe('success'));
  });
});
