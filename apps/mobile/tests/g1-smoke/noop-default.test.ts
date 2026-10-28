/**
 * VTID-05248 — guard: the DEFAULT push provider stays Noop.
 *
 * `G1TestPushProvider` is a TEST provider for the smoke only; FCM waits for G2.
 * This guard pins that the production default remains `NoopPushProvider` — the
 * smoke must never change it. The push smoke (push.test.ts) installs the test
 * provider through `setPushProvider` and restores `NoopPushProvider` in
 * `afterEach`; this test asserts the untouched default.
 */
import { getPushProvider, NoopPushProvider, setPushProvider } from '../../src/push/provider';
import { createG1TestPushProvider } from '../../src/push/g1-test-provider';

describe('G1 smoke guard — default push provider is Noop', () => {
  it('the installed default is NoopPushProvider (never available, no token)', async () => {
    expect(getPushProvider()).toBe(NoopPushProvider);
    expect(NoopPushProvider.isAvailable()).toBe(false);
    expect(await NoopPushProvider.getToken()).toBeNull();
    expect(await NoopPushProvider.requestPermission()).toBe('unavailable');
    expect(await NoopPushProvider.getInitialOpen()).toBeNull();
  });

  it('installing the test provider is reversible back to the Noop default', () => {
    const test = createG1TestPushProvider({ gatewayUrl: 'http://127.0.0.1:1', fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({}) }) as unknown as Response });
    setPushProvider(test);
    expect(getPushProvider()).toBe(test);
    expect(getPushProvider().isAvailable()).toBe(true);

    // Restore: the production default is Noop again.
    setPushProvider(NoopPushProvider);
    expect(getPushProvider()).toBe(NoopPushProvider);
    expect(getPushProvider().isAvailable()).toBe(false);
  });
});
