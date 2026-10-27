/**
 * VTID-05321 (messenger-ux-v2/ui-shared-cards, R11) — the shared item card in
 * a chat: resolved for the viewer (I6), skeleton → card / unavailable / error,
 * tap opens the item's in-app page; MessageBubble renders it for
 * `shared_content` with the caption below.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_API_URL: 'https://gw.test/api/v1', GATEWAY_BASE: 'https://gw.test' }));

import { SharedContentCard, fetchSharedPreview, sharedRefOf } from './SharedContentCard';

let reply: { status?: number; body: unknown } = { body: {} };
const fetchMock = vi.fn(async (_url: string) => ({ ok: (reply.status ?? 200) < 400, status: reply.status ?? 200, json: async () => reply.body }));

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname}</p>;
}

function renderCard(ref = { kind: 'event' as const, id: 'e1' }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/inbox']}>
        <Routes>
          <Route path="*" element={<><SharedContentCard sharedRef={ref} /><Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('sharedRefOf', () => {
  it('accepts the four kinds with an id and nothing else', () => {
    expect(sharedRefOf({ kind: 'post', id: 'p1' })).toEqual({ kind: 'post', id: 'p1' });
    expect(sharedRefOf({ kind: 'profile', id: 'u1', extra: 1 })).toEqual({ kind: 'profile', id: 'u1' });
    expect(sharedRefOf({ kind: 'article', id: 'x' })).toBeNull();
    expect(sharedRefOf({ kind: 'post', id: '' })).toBeNull();
    expect(sharedRefOf(null)).toBeNull();
  });
});

describe('fetchSharedPreview', () => {
  it('asks the gateway for the viewer\'s own preview, with the session token', async () => {
    reply = { body: { ok: true, available: false, reason: 'restricted' } };
    await expect(fetchSharedPreview({ kind: 'product', id: 'pr-1' })).resolves.toEqual({ available: false, reason: 'restricted' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://gw.test/api/v1/chat/shared-preview');
    expect(Object.fromEntries(url.searchParams)).toEqual({ kind: 'product', id: 'pr-1' });
    expect((fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }])[1].headers.Authorization).toBe('Bearer tok');
  });
});

describe('SharedContentCard', () => {
  it('shows a skeleton, then the card; a tap opens the item route', async () => {
    reply = { body: { ok: true, available: true, kind: 'event', id: 'e1', title: 'Sunrise yoga', description: 'At the lake', image_url: 'https://img/x.jpg', url: '/e/sunrise-yoga' } };
    renderCard();
    expect(screen.getByTestId('shared-card-loading')).toBeTruthy();
    const card = await screen.findByTestId('shared-card');
    expect(card.textContent).toContain('Sunrise yoga');
    expect(card.textContent).toContain('At the lake');
    fireEvent.click(card);
    expect(screen.getByTestId('where').textContent).toBe('/e/sunrise-yoga');
  });

  it.each([
    ['deleted', 'inbox.shared.unavailable.deleted'],
    ['restricted', 'inbox.shared.unavailable.restricted'],
  ])('an unavailable item (%s) shows the explanation, not an empty card', async (reason) => {
    reply = { body: { ok: true, available: false, reason } };
    renderCard({ kind: 'post', id: 'p1' });
    const box = await screen.findByTestId('shared-card-unavailable');
    expect(box.getAttribute('data-reason')).toBe(reason);
    expect(box.textContent?.length).toBeGreaterThan(10);
    expect(box.textContent).not.toContain('inbox.shared'); // real catalog text, not a raw key
    expect(screen.queryByTestId('shared-card')).toBeNull();
  });

  it('a failed preview says so and can be retried', async () => {
    reply = { status: 503, body: { ok: false, error: 'preview_unavailable' } };
    renderCard();
    await screen.findByTestId('shared-card-error');
    reply = { body: { ok: true, available: true, title: 'Back', description: '', image_url: null, url: '/pub/events/e1' } };
    fireEvent.click(screen.getByTestId('shared-card-retry'));
    await screen.findByTestId('shared-card');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never opens a URL that is not an in-app path', async () => {
    reply = { body: { ok: true, available: true, title: 'X', description: '', image_url: null, url: 'https://evil.example/x' } };
    renderCard();
    const card = await screen.findByTestId('shared-card');
    expect((card as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(card);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/inbox'));
  });
});
