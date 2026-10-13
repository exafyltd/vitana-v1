/**
 * VTID-05085 — useEnrichmentCards: GET contract, screen param, bearer token,
 * error surfaced (never a silent empty list), optimistic dismiss + rollback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

const notifyError = vi.fn();
vi.mock('@/lib/i18n-toast', async (orig) => ({ ...(await orig<typeof import('@/lib/i18n-toast')>()), notifyError: (...a: unknown[]) => notifyError(...a) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_API_URL: 'https://gw.test/api/v1' }));

import { useEnrichmentCards, parseEnrichmentCards, useInvalidateEnrichmentCards, ENRICHMENT_CARDS_STALE_MS } from './useEnrichmentCards';

const homePayload = {
  ok: true,
  cards: [
    { card_type: 'E1', category: 'enrichment', priority: 1, title: 'Zeig dein Gesicht', description: 'Foto' },
    { card_type: 'E2', category: 'enrichment', priority: 2, title: 'Bio', description: 'Text' },
    { card_type: 'Z9', category: 'enrichment', priority: 3, title: 'unknown', description: '' },
  ],
  profile_completion_pct: 40,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const W = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
  return { qc, W };
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  notifyError.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('useEnrichmentCards', () => {
  it('GETs the screen with the bearer token and keeps only known card types, in server order', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W } = wrapper();
    const { result } = renderHook(() => useEnrichmentCards('home'), { wrapper: W });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gw.test/api/v1/enrichment-cards?screen=home');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
    expect(result.current.cards.map((c) => c.card_type)).toEqual(['E1', 'E2']);
    expect(result.current.profileCompletionPct).toBe(40);
  });

  it('a gateway error is an error, not an empty "all done" list', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ ok: false, error: 'db' }, 500)));
    const { W } = wrapper();
    const { result } = renderHook(() => useEnrichmentCards('profile'), { wrapper: W });
    // The hook retries once before reporting the error.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.cards).toEqual([]);
  });

  it('does not fetch without a screen', () => {
    const { W } = wrapper();
    renderHook(() => useEnrichmentCards(null), { wrapper: W });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dismiss removes the card at once and POSTs { card_type }', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W } = wrapper();
    const { result } = renderHook(() => useEnrichmentCards('home'), { wrapper: W });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    let resolvePost!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((r) => (resolvePost = r)));
    fetchMock.mockResolvedValue(json({ ...homePayload, cards: homePayload.cards.slice(1) }));
    act(() => result.current.dismiss('E1'));
    await waitFor(() => expect(result.current.cards.map((c) => c.card_type)).toEqual(['E2']));
    const post = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/enrichment-cards/dismiss'))!;
    expect((post[1] as RequestInit).method).toBe('POST');
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ card_type: 'E1' });
    resolvePost(json({ ok: true, dismissed_until: '2026-10-20T00:00:00Z' }));
    await waitFor(() => expect(notifyError).not.toHaveBeenCalled());
  });

  it('a failed dismiss rolls the card back and tells the member', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W } = wrapper();
    const { result } = renderHook(() => useEnrichmentCards('home'), { wrapper: W });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    fetchMock.mockImplementation((u: string) =>
      Promise.resolve(String(u).endsWith('/dismiss') ? json({ ok: false }, 500) : json(homePayload)),
    );
    act(() => result.current.dismiss('E1'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('toasts.vitanaCards.dismissFailed'));
    await waitFor(() => expect(result.current.cards.map((c) => c.card_type)).toEqual(['E1', 'E2']));
  });
});

// Review finding (PR #1366, P1): a card whose step was just done must not stay
// on screen — completion flows invalidate, and focus / re-activation refetch.
describe('useEnrichmentCards — completed cards go away', () => {
  const afterE1 = { ...homePayload, cards: homePayload.cards.slice(1) };

  afterEach(() => {
    focusManager.setFocused(undefined);
    vi.restoreAllMocks();
  });

  it('a completing action (useInvalidateEnrichmentCards) re-reads the list and the done card disappears', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W } = wrapper();
    const { result } = renderHook(() => ({ cards: useEnrichmentCards('home'), refresh: useInvalidateEnrichmentCards() }), { wrapper: W });
    await waitFor(() => expect(result.current.cards.cards).toHaveLength(2));
    fetchMock.mockResolvedValueOnce(json(afterE1));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.cards.cards.map((c) => c.card_type)).toEqual(['E2']));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('coming back to the app (window focus) re-reads a stale list — e.g. after an OAuth round-trip', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W } = wrapper();
    const { result } = renderHook(() => useEnrichmentCards('home'), { wrapper: W });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    const later = Date.now() + ENRICHMENT_CARDS_STALE_MS + 1000;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    fetchMock.mockResolvedValueOnce(json(afterE1));
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(result.current.cards.map((c) => c.card_type)).toEqual(['E2']));
  });

  it('a kept-alive screen re-reads a stale list when it becomes active again, not while hidden', async () => {
    fetchMock.mockResolvedValueOnce(json(homePayload));
    const { W, qc } = wrapper();
    const { result, rerender } = renderHook(({ active }) => useEnrichmentCards('home', { active }), {
      wrapper: W,
      initialProps: { active: true },
    });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    rerender({ active: false });
    fetchMock.mockResolvedValue(json(afterE1));
    // a completion while Home is hidden: no request yet …
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['enrichment-cards'] });
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.cards).toHaveLength(2);
    // … but the moment Home is shown again it re-reads.
    rerender({ active: true });
    await waitFor(() => expect(result.current.cards.map((c) => c.card_type)).toEqual(['E2']));
  });
});

describe('parseEnrichmentCards', () => {
  it('rejects a payload without a cards array', () => {
    expect(() => parseEnrichmentCards({ ok: true })).toThrow();
    expect(() => parseEnrichmentCards({ ok: false, cards: [] })).toThrow();
  });
});
