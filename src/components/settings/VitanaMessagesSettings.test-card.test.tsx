/**
 * VTID-05589 (companion-test-card/v1-test-card-button) — the admin-only
 * "send me a test card" row in Vitana messages settings. A member sees no
 * change; an exafy admin presses once, the button is disabled while pending,
 * success links to the Vitana DM, each gateway error shows its own message.
 * No network: fetch is stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'tok' } } })) } },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
let isExafyAdmin = false;
vi.mock('@/hooks/useTenant', () => ({ useTenantSafe: () => ({ isExafyAdmin }) }));
const notify = vi.fn();
const notifyError = vi.fn();
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string) => k,
  notify: (...a: unknown[]) => notify(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));

import { VitanaMessagesSettings } from './VitanaMessagesSettings';
import { GATEWAY_API_URL } from '@/lib/gateway-base';
import { VITANA_BOT_USER_ID } from '@/lib/vitanaBotIdentity';

const TEST_CARD_URL = `${GATEWAY_API_URL}/companion/test-card`;
let testCardReply: { status: number; body: unknown };
let releaseTestCard: (() => void) | null = null;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url === TEST_CARD_URL) {
    if (releaseTestCard === null) {
      await new Promise<void>((resolve) => { releaseTestCard = resolve; });
    }
    return new Response(JSON.stringify(testCardReply.body), { status: testCardReply.status });
  }
  void init;
  return new Response(JSON.stringify({
    ok: true, preferences: { enabled: true, topic_health: true, topic_community: true, topic_business: false },
  }), { status: 200 });
});

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    React.createElement(MemoryRouter, null,
      React.createElement(QueryClientProvider, { client }, React.createElement(VitanaMessagesSettings))),
  );
}

const testCardCalls = () => fetchMock.mock.calls.filter(([u]) => u === TEST_CARD_URL);

beforeEach(() => {
  isExafyAdmin = false;
  testCardReply = { status: 200, body: { ok: true, chat_message_id: 'm1', moment_key: 'vitana_index', card_type: 'F2', text: 'Hallo' } };
  releaseTestCard = () => undefined; // answer at once unless a test holds it
  fetchMock.mockClear();
  notify.mockClear();
  notifyError.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('VitanaMessagesSettings — admin test card (VTID-05589)', () => {
  it('a member sees no test-card row and nothing is sent', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled')).not.toBeDisabled());
    expect(screen.queryByTestId('vitana-messages-test-card')).toBeNull();
    expect(testCardCalls()).toHaveLength(0);
  });

  it('an exafy admin sees the row; one press sends once and disables the button while pending', async () => {
    isExafyAdmin = true;
    releaseTestCard = null; // hold the reply
    renderSection();
    const button = await screen.findByTestId('vitana-messages-test-card');
    expect(screen.getByText('screens.settings.vitanaMessages.testCard.title')).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    expect(testCardCalls()).toHaveLength(1);
    releaseTestCard!();
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(testCardCalls()).toHaveLength(1);
  });

  it('success shows the sent message and a link to the chat with Vitana', async () => {
    isExafyAdmin = true;
    renderSection();
    fireEvent.click(await screen.findByTestId('vitana-messages-test-card'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('screens.settings.vitanaMessages.testCard.sent'));
    const link = await screen.findByTestId('vitana-messages-test-card-open');
    expect(link.getAttribute('href')).toBe(`/inbox/u/${VITANA_BOT_USER_ID}`);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it.each([
    [409, { ok: false, error: 'STAGING_DISABLED' }, 'unavailable'],
    [422, { ok: false, error: 'NO_VITANA_INDEX' }, 'noIndex'],
    [429, { ok: false, error: 'RATE_LIMITED', retry_after_s: 30 }, 'rateLimited'],
    [502, { ok: false, error: 'COMPOSE_FAILED' }, 'failed'],
  ])('status %i with %j shows the %s message and no chat link', async (status, body, key) => {
    isExafyAdmin = true;
    testCardReply = { status, body };
    renderSection();
    fireEvent.click(await screen.findByTestId('vitana-messages-test-card'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(
      'screens.settings.vitanaMessages.testCard.errorTitle', `screens.settings.vitanaMessages.testCard.${key}`,
    ));
    expect(screen.queryByTestId('vitana-messages-test-card-open')).toBeNull();
  });
});
