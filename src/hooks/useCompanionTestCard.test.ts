/**
 * VTID-05589 (companion-test-card/v1-test-card-button) — the client of
 * POST /api/v1/companion/test-card (gateway VTID-05588): one POST with the
 * session bearer and only `moment_key` in the body; every gateway error code
 * maps to its own result. No network: fetch is stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'tok' } } })) } },
}));

import { sendCompanionTestCard, testCardErrorKey, COMPANION_TEST_CARD_PATH } from './useCompanionTestCard';
import { GATEWAY_API_URL } from '@/lib/gateway-base';

let reply: { status: number; body: unknown };
const fetchMock = vi.fn(async () => new Response(JSON.stringify(reply.body), { status: reply.status }));

beforeEach(() => {
  reply = { status: 200, body: { ok: true, chat_message_id: 'm1', moment_key: 'vitana_index', card_type: 'F2', text: 'Hallo' } };
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useCompanionTestCard (VTID-05589)', () => {
  it('posts once to the test-card route with the bearer and only moment_key', async () => {
    const r = await sendCompanionTestCard();
    expect(r).toMatchObject({ ok: true, chat_message_id: 'm1', card_type: 'F2' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${GATEWAY_API_URL}${COMPANION_TEST_CARD_PATH}`);
    expect(COMPANION_TEST_CARD_PATH).toBe('/companion/test-card');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(init.body))).toEqual({ moment_key: 'vitana_index' });
  });

  it.each([
    [409, { ok: false, error: 'STAGING_DISABLED' }, 'unavailable'],
    [409, { ok: false, error: 'SEND_NOT_AVAILABLE', mode: 'off' }, 'unavailable'],
    [422, { ok: false, error: 'NO_VITANA_INDEX' }, 'noIndex'],
    [429, { ok: false, error: 'RATE_LIMITED', retry_after_s: 42 }, 'rateLimited'],
    [403, { ok: false, error: 'FORBIDDEN' }, 'failed'],
    [502, { ok: false, error: 'COMPOSE_FAILED' }, 'failed'],
    [500, 'not json', 'failed'],
  ])('status %i with %j maps to the %s message', async (status, body, key) => {
    reply = { status, body };
    const r = await sendCompanionTestCard();
    expect(r.ok).toBe(false);
    expect(testCardErrorKey(r)).toBe(`screens.settings.vitanaMessages.testCard.${key}`);
  });

  it('a network failure is a "failed" result, never a throw', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const r = await sendCompanionTestCard();
    expect(r.ok).toBe(false);
    expect(testCardErrorKey(r)).toBe('screens.settings.vitanaMessages.testCard.failed');
  });
});
