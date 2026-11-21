/**
 * Wave 1 readiness (push, P2) — the push client timeout, mocks only (an injected fetchImpl that never resolves).
 * Readiness evidence only: it does not prove the Wave 1 exit, which needs G1.
 * Subject: registration.ts:30 PUSH_TIMEOUT_MS, :71 call(), config/http.ts fetchWithTimeout.
 */
import '../../helpers/no-network';
import { PUSH_TIMEOUT_MS, createPushClient, type PushDeps } from '../../../src/push/registration';
import { NoopPushProvider, type PushProvider } from '../../../src/push/provider';
import type { AppFlags } from '../../../src/config/remote-config';

const SESSION = { accessToken: 'jwt-1' };
const FLAGS: AppFlags = { push_enabled: true, health_sync_enabled: false, orb_native_enabled: false };
const provider: PushProvider = { ...NoopPushProvider, isAvailable: () => true, getToken: async () => 'tok-1', setBadge: jest.fn(async () => undefined) };
const ok = () => ({ status: 200, ok: true, json: async () => ({ count: 1 }) }) as unknown as Response;
const never = () => new Promise<Response>(() => undefined);

function build(fetchImpl: PushDeps['fetchImpl'], timeoutMs?: number) {
  return createPushClient({
    provider: () => provider,
    flags: () => FLAGS,
    config: { gatewayUrl: 'https://g1-test.example.org' },
    platform: 'ios',
    appVersion: '1.0.0',
    fetchImpl,
    timeoutMs,
  });
}

describe('push client timeout (registration.ts:30, :71)', () => {
  it('PUSH_TIMEOUT_MS is 10000', () => {
    expect(PUSH_TIMEOUT_MS).toBe(10000);
  });

  it('registerToken that never answers returns { status: error } and does not throw', async () => {
    const c = build(never, 25);
    const r = await c.registerPushToken(SESSION);
    expect(r.status).toBe('error');
    expect(r).toEqual({ status: 'error', message: expect.stringContaining('timed out') });
    expect(c.registeredToken()).toBeNull();
  });

  it('syncBadge that never answers returns { status: error }, sets no badge and does not throw', async () => {
    (provider.setBadge as jest.Mock).mockClear();
    const c = build(never, 25);
    const r = await c.syncBadge(SESSION);
    expect(r).toEqual({ status: 'error', message: expect.stringContaining('timed out') });
    expect(provider.setBadge).not.toHaveBeenCalled();
  });

  it('unregisterToken that never answers returns { status: error } and keeps the registered token', async () => {
    let calls = 0;
    const c = build(() => (calls++ === 0 ? Promise.resolve(ok()) : never()), 25);
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'ok' });
    const r = await c.unregisterPushToken(SESSION);
    expect(r).toEqual({ status: 'error', message: expect.stringContaining('timed out') });
    expect(c.registeredToken()).toBe('tok-1');
  });

  it('a fetch rejection is also a result value, not a throw', async () => {
    const c = build(() => Promise.reject(new Error('boom')), 25);
    expect(await c.syncBadge(SESSION)).toEqual({ status: 'error', message: 'boom' });
  });

  describe('default timeout (fake timers)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('without timeoutMs the call is still pending at 9999 ms and errors at 10000 ms', async () => {
      const c = build(never);
      let settled: unknown = null;
      void c.syncBadge(SESSION).then((r) => {
        settled = r;
      });
      await jest.advanceTimersByTimeAsync(PUSH_TIMEOUT_MS - 1);
      expect(settled).toBeNull();
      await jest.advanceTimersByTimeAsync(1);
      expect(settled).toEqual({ status: 'error', message: expect.stringContaining('10000') });
    });
  });
});
