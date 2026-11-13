/**
 * Wave 1 readiness (push, P4) — createG1TestPushProvider with an injected fetchImpl (no fixture gateway, no socket).
 * Readiness evidence only: it does not prove the Wave 1 exit, which needs G1.
 * Subject: src/push/g1-test-provider.ts:75.
 *
 * OBSERVATION (recorded, not asserted as correct, not fixed): this test provider posts { token, device_type: 'ios'|'android' }
 * (g1-test-provider.ts:105), the shape the loopback fixture accepts, while createPushClient posts
 * { fcm_token, device_type: 'ios_native'|'android_native', app_version } (registration.ts:108). The two wire shapes differ,
 * so the G1 smoke does not exercise the production body. See acceptance.md, Findings.
 */
import '../../helpers/no-network';
import { DEFAULT_G1_TEST_TOKEN, createG1TestPushProvider } from '../../../src/push/g1-test-provider';
import { TOKEN_PATH } from '../../../src/push/registration';

const BASE = 'http://127.0.0.1:9';
const SESSION = { accessToken: 'jwt-9' };

function recorder(res: Partial<Response> & { json?: () => Promise<unknown> } = {}) {
  const fetchImpl = jest.fn(async (_u: string, _i?: RequestInit) => ({ status: 200, ok: true, json: async () => ({ ok: true }), ...res }) as unknown as Response);
  return fetchImpl;
}

describe('createG1TestPushProvider (g1-test-provider.ts:75)', () => {
  it('defaults: fixed test token and device type ios', () => {
    const p = createG1TestPushProvider({ gatewayUrl: BASE, fetchImpl: recorder() });
    expect(DEFAULT_G1_TEST_TOKEN).toBe('g1-test-push-token');
    expect(p.token).toBe(DEFAULT_G1_TEST_TOKEN);
    expect(p.deviceType).toBe('ios');
  });

  it('the android override and a custom token are honoured', () => {
    const p = createG1TestPushProvider({ gatewayUrl: BASE, deviceType: 'android', token: 'tok-x', fetchImpl: recorder() });
    expect(p.deviceType).toBe('android');
    expect(p.token).toBe('tok-x');
  });

  it('implements the provider port: available, yields its token, no open, no-op subscriptions, granted, setBadge resolves', async () => {
    const p = createG1TestPushProvider({ gatewayUrl: BASE, token: 'tok-y', fetchImpl: recorder() });
    expect(p.isAvailable()).toBe(true);
    expect(await p.getToken()).toBe('tok-y');
    expect(await p.getInitialOpen()).toBeNull();
    expect(await p.requestPermission()).toBe('granted');
    await expect(p.setBadge(3)).resolves.toBeUndefined();
    for (const unsub of [p.onTokenRefresh(jest.fn()), p.onOpen(jest.fn()), p.onForegroundMessage(jest.fn())]) {
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    }
  });

  it('pushOpen(url) builds the PushOpen a tapped notification delivers', () => {
    const p = createG1TestPushProvider({ gatewayUrl: BASE, fetchImpl: recorder() });
    expect(p.pushOpen('/inbox')).toEqual({ data: { url: '/inbox' } });
  });

  it('registerToken POSTs to TOKEN_PATH with the bearer, JSON headers and { token, device_type }', async () => {
    const fetchImpl = recorder({ status: 201, json: async () => ({ saved: true }) });
    const p = createG1TestPushProvider({ gatewayUrl: `${BASE}/`, deviceType: 'android', token: 'tok-z', fetchImpl });
    const r = await p.registerToken(SESSION);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(TOKEN_PATH).toBe('/api/v1/notifications/token');
    expect(url).toBe(`${BASE}${TOKEN_PATH}`); // trailing slash on the base is not doubled
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer jwt-9' });
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'tok-z', device_type: 'android' });
    expect(r).toEqual({ status: 201, ok: true, body: { saved: true } });
  });

  it('a non-JSON body is answered as null, with the status preserved', async () => {
    const fetchImpl = recorder({
      status: 502,
      ok: false,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    const p = createG1TestPushProvider({ gatewayUrl: BASE, fetchImpl });
    expect(await p.registerToken(SESSION)).toEqual({ status: 502, ok: false, body: null });
  });

  it('a gateway that never answers rejects registerToken after timeoutMs', async () => {
    const p = createG1TestPushProvider({ gatewayUrl: BASE, timeoutMs: 25, fetchImpl: () => new Promise<Response>(() => undefined) });
    await expect(p.registerToken(SESSION)).rejects.toThrow(/timed out after 25 ms/);
  });
});

describe('needs G1 / G2 (skipped, NOT counted toward the Wave 1 exit)', () => {
  // needs G1 (isolated test backend): the token POST must be recorded by a real test backend (stored per member), not by an injected fetch
  it.skip('a token POST is recorded by the G1 test backend for the signed-in member', () => undefined);

  // needs G2 (Firebase push project): APNs/FCM delivery of a notification to a physical iOS and Android device needs real push credentials
  it.skip('a notification is delivered by APNs or FCM to a device and its tap opens the deep link', () => undefined);

  // needs G1 (isolated test backend): the unread count for a real member comes from the backend, not from a mock
  it.skip('the app badge shows the unread count read from the G1 backend for a real member', () => undefined);
});
