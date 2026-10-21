/**
 * VTID-05248 — G1 Wave-1 exit path, smoke (b): push, OFFLINE against the
 * loopback fixture gateway.
 *
 * The TEST provider `G1TestPushProvider` (src/push/g1-test-provider.ts) is
 * installed through the REAL `setPushProvider` seam (provider.ts:52), then:
 *  - it posts its token to the fixture's `POST /api/v1/notifications/token`
 *    (carrying the member's bearer), and the fixture records it;
 *  - a push whose `data.url` is a universal link resolves through the REAL
 *    `resolvePushLink` / `resolveLink` (resolve-link.ts) to the right route.
 *
 * The production default provider is restored after each test; this suite never
 * changes it. Every call is to 127.0.0.1 — `loopbackFetch` refuses any other
 * host. No existing module is modified.
 */
import { getPushProvider, setPushProvider, NoopPushProvider } from '../../src/push/provider';
import { createG1TestPushProvider, type G1TestPushProvider } from '../../src/push/g1-test-provider';
import { resolveLink, resolvePushLink } from '../../src/linking/resolve-link';
import type { FixtureGateway } from '../../tools/fixture-gateway/server';
import { loopbackFetch, SMOKE_SESSION, smokeConfig, startFixture } from './helpers';

const LINK_HOSTS = ['vitanaland.com'];

describe('G1 smoke (b) — push over the loopback fixture', () => {
  let gw: FixtureGateway;
  let url: string;
  let provider: G1TestPushProvider;

  beforeEach(async () => {
    ({ gw, url } = await startFixture({
      appConfig: {
        schemaVersion: 1,
        ttlSeconds: 300,
        flags: { push_enabled: true, health_sync_enabled: false, orb_native_enabled: false },
        minSupportedVersion: '0.0.0',
        recommendedVersion: null,
        updateUrl: null,
      },
    }));
    provider = createG1TestPushProvider({ gatewayUrl: smokeConfig(url).gatewayUrl as string, fetchImpl: loopbackFetch() });
    setPushProvider(provider);
  });

  afterEach(async () => {
    // Restore the production default — never leave the test provider installed.
    setPushProvider(NoopPushProvider);
    await gw.stop();
  });

  it('installs through setPushProvider and is the active provider', () => {
    expect(getPushProvider()).toBe(provider);
    expect(getPushProvider().isAvailable()).toBe(true);
  });

  it('posts its token to POST /api/v1/notifications/token and the fixture records it', async () => {
    const result = await provider.registerToken(SMOKE_SESSION);
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);

    expect(gw.tokens).toHaveLength(1);
    expect(gw.tokens[0]).toMatchObject({ token: provider.token, device_type: provider.deviceType });

    const posted = gw.requests.find((r) => r.method === 'POST' && r.path === '/api/v1/notifications/token');
    expect(posted).toBeDefined();
    expect(posted!.authorization).toBe(`Bearer ${SMOKE_SESSION.accessToken}`);
    // Talked only to the loopback fixture.
    expect(url.startsWith('http://127.0.0.1:')).toBe(true);
  });

  it('a push data.url resolves through resolvePushLink / resolveLink to the right route', () => {
    const open = provider.pushOpen('https://vitanaland.com/inbox/42?tab=unread');

    const viaPush = resolvePushLink(open.data, { linkHosts: LINK_HOSTS });
    expect(viaPush).not.toBeNull();
    expect(viaPush).toMatchObject({ kind: 'route', pathname: '/inbox/42', params: { tab: 'unread' } });

    // Same result through resolveLink directly on the URL.
    const viaLink = resolveLink(open.data.url, { linkHosts: LINK_HOSTS });
    expect(viaLink).toEqual(viaPush);
  });

  it('a push carrying an auth universal link resolves to the auth kind', () => {
    const open = provider.pushOpen('https://vitanaland.com/reset-password#access_token=abc&type=recovery');
    const resolved = resolvePushLink(open.data, { linkHosts: LINK_HOSTS });
    expect(resolved).toMatchObject({ kind: 'auth', path: '/reset-password', tokens: { access_token: 'abc', type: 'recovery' } });
  });

  it('a foreign-host push does not resolve (never opened in-app)', () => {
    const open = provider.pushOpen('https://evil.example.com/inbox');
    expect(resolvePushLink(open.data, { linkHosts: LINK_HOSTS })).toBeNull();
  });
});
