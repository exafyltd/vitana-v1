/** VTID-05178 — provider-neutral push client (N4-APP Change 10). No network: fetch is always a fake. */
import { createPushClient, deviceTypeFor, getPushClient, registerPushToken, setPushClient, syncBadge, type PushDeps } from '../src/push/registration';
import { NoopPushProvider, getPushProvider, setPushProvider, type PushProvider } from '../src/push/provider';
import { setRemoteConfigClient } from '../src/config/remote-config';
import type { AppFlags } from '../src/config/remote-config';

const G1 = 'https://g1-test.example.org';
const SESSION = { accessToken: 'jwt-1' };
const ON: AppFlags = { push_enabled: true, health_sync_enabled: false, orb_native_enabled: false };
const OFF: AppFlags = { ...ON, push_enabled: false };

function ok(json: unknown = { ok: true }): Response {
  return { status: 200, ok: true, json: async () => json } as unknown as Response;
}

function fakeProvider(over: Partial<PushProvider> = {}): PushProvider & { setBadge: jest.Mock } {
  return {
    ...NoopPushProvider,
    isAvailable: () => true,
    getToken: async () => 'fcm-token-1',
    setBadge: jest.fn(async () => undefined),
    ...over,
  } as PushProvider & { setBadge: jest.Mock };
}

function client(over: Partial<PushDeps> = {}) {
  const fetchImpl = jest.fn(async (_u: string, _i?: RequestInit) => ok({ ok: true, count: 4 }));
  const provider = over.provider ? over.provider() : fakeProvider();
  const deps: PushDeps = {
    provider: () => provider,
    flags: () => ON,
    config: { gatewayUrl: G1 },
    platform: 'ios',
    appVersion: '1.2.3',
    fetchImpl,
    ...over,
  };
  return { c: createPushClient(deps), fetchImpl: deps.fetchImpl as jest.Mock, provider };
}

describe('Noop provider (the only one until G2)', () => {
  it('is never available and never yields a token', async () => {
    expect(NoopPushProvider.isAvailable()).toBe(false);
    expect(await NoopPushProvider.getToken()).toBeNull();
    expect(await NoopPushProvider.requestPermission()).toBe('unavailable');
    expect(await NoopPushProvider.getInitialOpen()).toBeNull();
  });

  it('is the installed provider', () => {
    expect(getPushProvider()).toBe(NoopPushProvider);
  });

  it('makes no call, even with push_enabled on', async () => {
    const { c, fetchImpl } = client({ provider: () => NoopPushProvider });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'provider_unavailable' });
    expect(await c.syncBadge(SESSION)).toEqual({ status: 'skipped', reason: 'provider_unavailable' });
    expect(await c.unregisterPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'no_token' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('registration gate: provider available AND push_enabled', () => {
  it('push_enabled off → no call', async () => {
    const { c, fetchImpl } = client({ flags: () => OFF });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'push_disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no session → no call', async () => {
    const { c, fetchImpl } = client();
    expect(await c.registerPushToken(null)).toEqual({ status: 'skipped', reason: 'no_session' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no gateway URL → no call', async () => {
    const { c, fetchImpl } = client({ config: {} });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'no_gateway' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a production gateway URL is refused → no call', async () => {
    const { c, fetchImpl } = client({ config: { gatewayUrl: 'https://gateway.vitanaland.com' } });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'no_gateway' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('no token from the provider → no call', async () => {
    const { c, fetchImpl } = client({ provider: () => fakeProvider({ getToken: async () => null }) });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'no_token' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('registration body (Change 10)', () => {
  it.each([
    ['ios', 'ios_native'],
    ['android', 'android_native'],
  ] as const)('%s posts { fcm_token, device_type: %s, app_version } with the bearer token', async (platform, type) => {
    const { c, fetchImpl } = client({ platform });
    expect(await c.registerPushToken(SESSION)).toEqual({ status: 'ok' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${G1}/api/v1/notifications/token`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-1', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ fcm_token: 'fcm-token-1', device_type: type, app_version: '1.2.3' });
    expect(deviceTypeFor(platform)).toBe(type);
    // The gateway sets the label itself; the app never sends one.
    expect(JSON.parse(init.body)).not.toHaveProperty('device_label');
  });

  it('a refreshed token is registered as given', async () => {
    const { c, fetchImpl } = client();
    await c.registerPushToken(SESSION, 'fcm-token-2');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).fcm_token).toBe('fcm-token-2');
    expect(c.registeredToken()).toBe('fcm-token-2');
  });

  it('an error answer or a network failure is a result, never a throw', async () => {
    const bad = client({ fetchImpl: jest.fn(async () => ({ status: 500, ok: false }) as Response) });
    expect(await bad.c.registerPushToken(SESSION)).toEqual({ status: 'error', message: 'token registration answered 500' });
    expect(bad.c.registeredToken()).toBeNull();
    const down = client({ fetchImpl: jest.fn(async () => Promise.reject(new Error('offline'))) });
    expect(await down.c.registerPushToken(SESSION)).toEqual({ status: 'error', message: 'offline' });
  });
});

describe('sign-out', () => {
  it('DELETEs the registered token before the session clears', async () => {
    const { c, fetchImpl } = client();
    await c.registerPushToken(SESSION);
    const order: string[] = [];
    fetchImpl.mockImplementationOnce(async () => {
      order.push('delete');
      return ok();
    });
    const result = await c.unregisterPushToken(SESSION);
    order.push('session cleared');
    expect(result).toEqual({ status: 'ok' });
    expect(order).toEqual(['delete', 'session cleared']);
    const [url, init] = fetchImpl.mock.calls[1];
    expect(url).toBe(`${G1}/api/v1/notifications/token`);
    expect(init.method).toBe('DELETE');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-1' });
    expect(JSON.parse(init.body)).toEqual({ fcm_token: 'fcm-token-1' });
    expect(c.registeredToken()).toBeNull();
  });

  it('nothing registered → no call', async () => {
    const { c, fetchImpl } = client();
    expect(await c.unregisterPushToken(SESSION)).toEqual({ status: 'skipped', reason: 'no_token' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('badge sync', () => {
  it('GETs unread-count and calls setBadge', async () => {
    const { c, fetchImpl, provider } = client();
    expect(await c.syncBadge(SESSION)).toEqual({ status: 'ok' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${G1}/api/v1/notifications/unread-count`);
    expect(init.method).toBe('GET');
    expect((provider as ReturnType<typeof fakeProvider>).setBadge).toHaveBeenCalledWith(4);
  });

  it('a malformed count sets 0', async () => {
    const { c, provider } = client({ fetchImpl: jest.fn(async () => ok({ ok: true, count: 'x' })) });
    await c.syncBadge(SESSION);
    expect((provider as ReturnType<typeof fakeProvider>).setBadge).toHaveBeenCalledWith(0);
  });

  it('push_enabled off → no call and no badge', async () => {
    const { c, fetchImpl, provider } = client({ flags: () => OFF });
    await c.syncBadge(SESSION);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((provider as ReturnType<typeof fakeProvider>).setBadge).not.toHaveBeenCalled();
  });
});

describe('permission', () => {
  it('is only ever requested on demand, through the provider', async () => {
    const requestPermission = jest.fn(async () => 'granted' as const);
    const { c } = client({ provider: () => fakeProvider({ requestPermission }) });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(await c.requestPushPermission()).toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('the app-wide client in this build', () => {
  afterEach(() => {
    setPushClient(null);
    setPushProvider(NoopPushProvider);
    setRemoteConfigClient(null);
  });

  it('makes no network call (Noop provider, no gateway URL, flags off)', async () => {
    setPushClient(null);
    const spy = jest.spyOn(global, 'fetch' as never);
    expect((await registerPushToken(SESSION)).status).toBe('skipped');
    expect((await syncBadge(SESSION)).status).toBe('skipped');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(getPushClient()).toBe(getPushClient());
  });
});
