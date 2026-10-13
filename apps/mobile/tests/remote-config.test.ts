/** VTID-05178 — remote config client (N4-APP Change 9). No network: fetch is always a fake. */
import {
  CACHE_KEY,
  CACHE_MAX_AGE_MS,
  createRemoteConfigClient,
  defaultPlatformConfig,
  deriveView,
  getAppFlags,
  getRemoteConfigClient,
  parseAppConfigResponse,
  setRemoteConfigClient,
  type RemoteConfigDeps,
  type RemoteConfigState,
} from '../src/config/remote-config';
import { createMemoryStore } from '../src/config/kv-store';
import { compareVersions } from '../src/config/version';

const G1 = 'https://g1-test.example.org';

function body(overrides: Record<string, unknown> = {}, ios: Record<string, unknown> = {}) {
  return {
    ok: true,
    schema_version: 1,
    generated_at: '2026-10-13T00:00:00Z',
    ttl_seconds: 300,
    platforms: {
      ios: { min_supported_version: '0.0.0', recommended_version: null, update_url: null, flags: { push_enabled: true }, ...ios },
      android: { min_supported_version: '0.0.0', recommended_version: null, update_url: null, flags: {} },
    },
    ...overrides,
  };
}

function response(status: number, json: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => json } as unknown as Response;
}

function setup(over: Partial<RemoteConfigDeps> = {}) {
  let now = 1_000_000;
  const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => response(200, body()));
  const store = createMemoryStore();
  const deps: RemoteConfigDeps = {
    config: { gatewayUrl: G1 },
    platform: 'ios',
    store,
    fetchImpl,
    now: () => now,
    ...over,
  };
  const client = createRemoteConfigClient(deps);
  return { client, fetchImpl: deps.fetchImpl as jest.Mock, store, advance: (ms: number) => (now += ms), deps };
}

describe('fetch', () => {
  it('fetches GET <gateway>/api/v1/app-config and uses the response', async () => {
    const { client, fetchImpl } = setup();
    expect(client.getState().source).toBe('default');
    const state = await client.refresh();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${G1}/api/v1/app-config`);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'GET' });
    expect(state.source).toBe('remote');
    expect(state.platformConfig.flags.push_enabled).toBe(true);
    expect(state.platformConfig.flags.health_sync_enabled).toBe(false);
  });

  it('a trailing slash on the gateway URL does not double the slash', async () => {
    const { client, fetchImpl } = setup({ config: { gatewayUrl: `${G1}/` } });
    await client.refresh();
    expect(fetchImpl.mock.calls[0][0]).toBe(`${G1}/api/v1/app-config`);
  });

  it('notifies subscribers', async () => {
    const { client } = setup();
    const listener = jest.fn();
    client.subscribe(listener);
    await client.refresh();
    expect(listener).toHaveBeenCalled();
  });
});

describe('schema validation', () => {
  it('ignores unknown flags and treats missing flags as false', () => {
    const parsed = parseAppConfigResponse(body({}, { flags: { push_enabled: true, brand_new_flag: true } }), 'ios');
    expect(parsed?.platformConfig.flags).toEqual({ push_enabled: true, health_sync_enabled: false, orb_native_enabled: false });
    expect(Object.keys(parsed!.platformConfig.flags)).not.toContain('brand_new_flag');
  });

  it('only the literal true turns a flag on', () => {
    const parsed = parseAppConfigResponse(body({}, { flags: { push_enabled: 'true', health_sync_enabled: 1 } }), 'ios');
    expect(parsed?.platformConfig.flags.push_enabled).toBe(false);
    expect(parsed?.platformConfig.flags.health_sync_enabled).toBe(false);
  });

  it.each([
    ['ok false', body({ ok: false })],
    ['another schema version', body({ schema_version: 2 })],
    ['no platforms', body({ platforms: undefined })],
    ['bad min version', body({}, { min_supported_version: 'latest' })],
    ['flags not an object', body({}, { flags: ['push_enabled'] })],
    ['not an object', 'nope'],
  ])('rejects %s', (_name, b) => {
    expect(parseAppConfigResponse(b, 'ios')).toBeNull();
  });

  it('reads only its own platform block', () => {
    const parsed = parseAppConfigResponse(body(), 'android');
    expect(parsed?.platformConfig.flags.push_enabled).toBe(false);
  });

  it('drops a non-https update URL', () => {
    expect(parseAppConfigResponse(body({}, { update_url: 'http://example.org/app' }), 'ios')?.platformConfig.update_url).toBeNull();
    expect(parseAppConfigResponse(body({}, { update_url: 'javascript:alert(1)' }), 'ios')?.platformConfig.update_url).toBeNull();
    expect(parseAppConfigResponse(body({}, { update_url: 'https://apps.example.org/x' }), 'ios')?.platformConfig.update_url).toBe(
      'https://apps.example.org/x',
    );
  });
});

describe('fail-safe', () => {
  const failures: [string, () => Promise<Response>][] = [
    ['503 config_unavailable', async () => response(503, { ok: false, error: 'config_unavailable' })],
    ['network error', async () => Promise.reject(new Error('offline'))],
    ['invalid body', async () => response(200, { ok: true })],
  ];

  it.each(failures)('%s with no cache → defaults (every flag off)', async (_n, impl) => {
    const { client } = setup({ fetchImpl: jest.fn(impl) });
    const state = await client.refresh();
    expect(state.source).toBe('default');
    expect(state.platformConfig).toEqual(defaultPlatformConfig());
  });

  it.each(failures)('%s with a fresh cache → the cache', async (_n, impl) => {
    const { client, store, deps, advance } = setup();
    await client.refresh();
    expect(store.getItem(CACHE_KEY)).not.toBeNull();
    // A new launch with the same store, then a failing fetch.
    advance(60 * 60 * 1000);
    const next = createRemoteConfigClient({ ...deps, fetchImpl: jest.fn(impl) });
    expect(next.getState().source).toBe('cache');
    const state = await next.refresh();
    expect(state.source).toBe('cache');
    expect(state.platformConfig.flags.push_enabled).toBe(true);
  });

  it('a cache older than 7 days falls back to the defaults', async () => {
    const { client, deps, advance } = setup();
    await client.refresh();
    advance(CACHE_MAX_AGE_MS + 1);
    const next = createRemoteConfigClient({ ...deps, fetchImpl: jest.fn(async () => response(503, {})) });
    expect(next.getState().source).toBe('default');
    expect((await next.refresh()).platformConfig.flags.push_enabled).toBe(false);
  });

  it('a timeout falls back without hanging', async () => {
    jest.useFakeTimers();
    try {
      const { client } = setup({ fetchImpl: jest.fn(() => new Promise<Response>(() => undefined)), timeoutMs: 3000 });
      const p = client.refresh();
      jest.advanceTimersByTime(3001);
      expect((await p).source).toBe('default');
    } finally {
      jest.useRealTimers();
    }
  });

  it('no gateway URL → no fetch at all, defaults', async () => {
    const { client, fetchImpl } = setup({ config: {} });
    const state = await client.refresh({ force: true });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state.source).toBe('default');
  });

  it.each(['https://gateway.vitanaland.com', 'https://preview-aws-gateway.vitanaland.com'])(
    'a production or staging gateway URL (%s) is refused by requireUrl: no fetch',
    async (url) => {
      const { client, fetchImpl } = setup({ config: { gatewayUrl: url } });
      await client.refresh({ force: true });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it('a corrupt cache entry is ignored', () => {
    const store = createMemoryStore();
    store.setItem(CACHE_KEY, '{not json');
    const { client } = setup({ store });
    expect(client.getState().source).toBe('default');
  });

  it('a cache for the other platform is ignored', async () => {
    const { client, deps } = setup();
    await client.refresh();
    const android = createRemoteConfigClient({ ...deps, platform: 'android' });
    expect(android.getState().source).toBe('default');
  });
});

describe('TTL throttling', () => {
  it('fetches at most once per ttl_seconds', async () => {
    const { client, fetchImpl, advance } = setup();
    await client.refresh();
    advance(299_000);
    await client.refresh();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    advance(2_000);
    await client.refresh();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('force bypasses the TTL; concurrent refreshes share one request', async () => {
    const { client, fetchImpl } = setup();
    await Promise.all([client.refresh(), client.refresh()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await client.refresh({ force: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('update gate', () => {
  const state = (min: string, recommended: string | null = null): RemoteConfigState => ({
    platformConfig: { ...defaultPlatformConfig(), min_supported_version: min, recommended_version: recommended, update_url: 'https://apps.example.org' },
    source: 'remote',
    fetchedAt: 1,
    ttlSeconds: 300,
  });

  it('compares numerically per dotted part', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.9.9', '1.10.0')).toBe(-1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBe(0);
  });

  it('updateRequired when the app is below min_supported_version', () => {
    expect(deriveView(state('1.10.0'), '1.9.9').updateRequired).toBe(true);
    expect(deriveView(state('1.9.9'), '1.10.0').updateRequired).toBe(false);
    expect(deriveView(state('1.10.0'), '1.10.0').updateRequired).toBe(false);
  });

  it('updateRecommended only when not required', () => {
    expect(deriveView(state('1.0.0', '1.10.0'), '1.9.9')).toMatchObject({ updateRequired: false, updateRecommended: true });
    expect(deriveView(state('2.0.0', '3.0.0'), '1.0.0')).toMatchObject({ updateRequired: true, updateRecommended: false });
    expect(deriveView(state('1.0.0', null), '1.0.0').updateRecommended).toBe(false);
  });

  it('the defaults never block anyone', () => {
    const view = deriveView({ platformConfig: defaultPlatformConfig(), source: 'default', fetchedAt: null, ttlSeconds: 300 }, '0.0.0');
    expect(view).toEqual({
      flags: { push_enabled: false, health_sync_enabled: false, orb_native_enabled: false },
      updateRequired: false,
      updateRecommended: false,
      updateUrl: null,
      source: 'default',
    });
  });
});

describe('the app-wide client in this build', () => {
  afterEach(() => setRemoteConfigClient(null));

  it('has no gateway URL, so it never calls fetch and every flag is off', async () => {
    setRemoteConfigClient(null);
    const spy = jest.spyOn(global, 'fetch' as never);
    await getRemoteConfigClient().refresh({ force: true });
    expect(spy).not.toHaveBeenCalled();
    expect(getAppFlags()).toEqual({ push_enabled: false, health_sync_enabled: false, orb_native_enabled: false });
    spy.mockRestore();
  });
});
