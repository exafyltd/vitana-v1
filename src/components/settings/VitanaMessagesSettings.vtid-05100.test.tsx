/**
 * VTID-05100 (Companion Messages, Phase 2) — the "Vitana messages" settings
 * section reads the member's preferences from the gateway and every switch
 * PATCHes exactly the field it controls. No network: fetch is stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'tok' } } })) } },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
const notify = vi.fn();
const notifyError = vi.fn();
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string) => k,
  notify: (...a: unknown[]) => notify(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));

import { VitanaMessagesSettings } from './VitanaMessagesSettings';
import { GATEWAY_API_URL } from '@/lib/gateway-base';

const URL = `${GATEWAY_API_URL}/companion/preferences`;
let prefs: Record<string, boolean>;
let patchStatus = 200;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (init?.method === 'PATCH') {
    if (patchStatus !== 200) return new Response(JSON.stringify({ ok: false, error: 'boom' }), { status: patchStatus });
    prefs = { ...prefs, ...JSON.parse(String(init.body)) };
  }
  return new Response(JSON.stringify({ ok: true, preferences: prefs }), { status: 200 });
});

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client }, React.createElement(VitanaMessagesSettings)),
  );
}

beforeEach(() => {
  prefs = { enabled: true, topic_health: true, topic_community: true, topic_business: false };
  patchStatus = 200;
  fetchMock.mockClear();
  notify.mockClear();
  notifyError.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('VitanaMessagesSettings (VTID-05100)', () => {
  it('renders the section with the saved preferences from the gateway', async () => {
    renderSection();
    expect(screen.getByText('screens.settings.vitanaMessages.title')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled')).not.toBeDisabled());
    expect(fetchMock).toHaveBeenCalledWith(URL, expect.objectContaining({ method: 'GET' }));
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(screen.getByTestId('vitana-messages-enabled')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('vitana-messages-topic_health')).toHaveAttribute('aria-checked', 'true');
    // Business is an opt-in: off unless the member turned it on.
    expect(screen.getByTestId('vitana-messages-topic_business')).toHaveAttribute('aria-checked', 'false');
  });

  it('PATCHes only the toggled field (business opt-in)', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-topic_business')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('vitana-messages-topic_business'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(URL, expect.objectContaining({ method: 'PATCH' })));
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ topic_business: true });
    await waitFor(() => expect(screen.getByTestId('vitana-messages-topic_business')).toHaveAttribute('aria-checked', 'true'));
    expect(notify).toHaveBeenCalled();
  });

  it('turning Vitana messages off PATCHes { enabled: false } and locks the topics', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('vitana-messages-enabled'));
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled')).toHaveAttribute('aria-checked', 'false'));
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ enabled: false });
    expect(screen.getByTestId('vitana-messages-topic_health')).toBeDisabled();
  });

  it('a failed save shows the localized error toast and keeps the saved state', async () => {
    patchStatus = 500;
    renderSection();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-topic_health')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('vitana-messages-topic_health'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('toasts.settings.error', 'toasts.settings.failedUpdateSettings'));
    expect(screen.getByTestId('vitana-messages-topic_health')).toHaveAttribute('aria-checked', 'true');
  });

  it('a failed load disables the switches instead of guessing a state', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('{}', { status: 503 }));
    renderSection();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('screens.settings.vitanaMessages.loadError'));
    expect(screen.getByTestId('vitana-messages-enabled')).toBeDisabled();
  });
});
