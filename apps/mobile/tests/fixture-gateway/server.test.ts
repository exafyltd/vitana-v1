/**
 * VTID-05250 — the fixture gateway for the native app's plain-HTTP G1 endpoints.
 *
 * Loopback only (127.0.0.1): the fixture opens no outbound connection and can
 * never reach a real host, so no request ever lands on staging or production.
 */
import {
  createFixtureGateway,
  buildAppConfigBody,
  buildAasa,
  buildAssetlinks,
  defaultScenario,
  isAllowedBindHost,
  IDENTIFIERS,
  type FixtureGateway,
} from '../../tools/fixture-gateway/server';
import { parseAppConfigResponse } from '../../src/config/remote-config';

/** A minimal fetch over node:http for loopback tests (never another host). */
function loopbackFetch() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const http = require('http') as typeof import('http');
  return (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    new Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>((resolve, reject) => {
      const u = new URL(url);
      if (u.hostname !== '127.0.0.1') return reject(new Error(`loopbackFetch refuses ${u.hostname}`));
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: init?.method ?? 'GET', headers: init?.headers },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            resolve({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(data), text: async () => data });
          });
        },
      );
      req.on('error', reject);
      if (init?.body) req.write(init.body);
      req.end();
    });
}

describe('bind limits', () => {
  it('allows loopback or a private range only', () => {
    for (const ok of ['127.0.0.1', '::1', 'localhost', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.20']) {
      expect(isAllowedBindHost(ok)).toBe(true);
    }
    for (const bad of ['0.0.0.0', '8.8.8.8', '172.32.0.1', '192.169.0.1', '::', 'example.org']) {
      expect(isAllowedBindHost(bad)).toBe(false);
    }
  });

  it('refuses to bind to a non-loopback / non-private address', () => {
    expect(() => createFixtureGateway({ host: '0.0.0.0' })).toThrow(/refuses to bind/);
    expect(() => createFixtureGateway({ host: '8.8.8.8' })).toThrow(/refuses to bind/);
  });
});

describe('document builders', () => {
  it('the default app-config body passes the real parseAppConfigResponse for both platforms', () => {
    const body = buildAppConfigBody(defaultScenario().appConfig);
    for (const platform of ['ios', 'android'] as const) {
      const parsed = parseAppConfigResponse(body, platform);
      expect(parsed).not.toBeNull();
      expect(parsed!.platformConfig.min_supported_version).toBe('0.0.0');
      expect(parsed!.ttlSeconds).toBe(300);
      expect(parsed!.platformConfig.flags).toEqual({
        push_enabled: false,
        health_sync_enabled: false,
        orb_native_enabled: false,
      });
    }
  });

  it('a scenario with flags on and a min version still passes parseAppConfigResponse', () => {
    const cfg = {
      schemaVersion: 1,
      ttlSeconds: 60,
      flags: { push_enabled: true, health_sync_enabled: false, orb_native_enabled: true },
      minSupportedVersion: '1.2.0',
      recommendedVersion: '1.5.0',
      updateUrl: 'https://apps.example.test/app',
    };
    const parsed = parseAppConfigResponse(buildAppConfigBody(cfg), 'ios');
    expect(parsed).not.toBeNull();
    expect(parsed!.platformConfig.min_supported_version).toBe('1.2.0');
    expect(parsed!.platformConfig.recommended_version).toBe('1.5.0');
    expect(parsed!.platformConfig.update_url).toBe('https://apps.example.test/app');
    expect(parsed!.platformConfig.flags.push_enabled).toBe(true);
    expect(parsed!.platformConfig.flags.orb_native_enabled).toBe(true);
    expect(parsed!.ttlSeconds).toBe(60);
  });

  it('the AASA uses the .dev iOS identifier', () => {
    const aasa = buildAasa() as { applinks: { apps: unknown[]; details: Array<{ appID: string; paths: string[] }> } };
    expect(aasa.applinks.apps).toEqual([]);
    expect(aasa.applinks.details).toHaveLength(1);
    expect(aasa.applinks.details[0].appID.endsWith(IDENTIFIERS.ios)).toBe(true);
    expect(aasa.applinks.details[0].appID).toContain('com.exafy.maxina.dev');
    expect(aasa.applinks.details[0].paths).toEqual(['*']);
  });

  it('assetlinks uses the .dev Android identifier', () => {
    const links = buildAssetlinks() as Array<{ relation: string[]; target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] } }>;
    expect(links).toHaveLength(1);
    expect(links[0].relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(links[0].target.namespace).toBe('android_app');
    expect(links[0].target.package_name).toBe(IDENTIFIERS.android);
    expect(links[0].target.package_name).toBe('com.vitanaland.app.dev');
    expect(links[0].target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });
});

describe('live routes over loopback', () => {
  let gw: FixtureGateway;
  let url: string;
  const fetch = loopbackFetch();

  beforeEach(async () => {
    gw = createFixtureGateway();
    url = (await gw.start()).url;
  });
  afterEach(async () => {
    await gw.stop();
  });

  it('binds to 127.0.0.1', () => {
    expect(url.startsWith('http://127.0.0.1:')).toBe(true);
  });

  it('GET /api/v1/app-config answers a body that passes parseAppConfigResponse', async () => {
    const res = await fetch(`${url}/api/v1/app-config`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(parseAppConfigResponse(body, 'ios')).not.toBeNull();
    expect(parseAppConfigResponse(body, 'android')).not.toBeNull();
  });

  it('GET /api/v1/auth/me answers the signed-in member by default', async () => {
    const res = await fetch(`${url}/api/v1/auth/me`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; user: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('fixture-member');
  });

  it('GET /api/v1/auth/me returns 401 when the unauthenticated scenario is toggled on', async () => {
    gw.setScenario({ authMeStatus: 401 });
    const res = await fetch(`${url}/api/v1/auth/me`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it('POST /api/v1/notifications/token records the token and device_type', async () => {
    const res = await fetch(`${url}/api/v1/notifications/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'expo-push-abc', device_type: 'ios' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; token: string; device_type: string };
    expect(body).toMatchObject({ ok: true, token: 'expo-push-abc', device_type: 'ios' });
    expect(gw.tokens).toHaveLength(1);
    expect(gw.tokens[0]).toMatchObject({ token: 'expo-push-abc', device_type: 'ios' });
  });

  it('POST /api/v1/notifications/token rejects a missing token or bad device_type', async () => {
    const res = await fetch(`${url}/api/v1/notifications/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_type: 'desktop' }),
    });
    expect(res.status).toBe(400);
    expect(gw.tokens).toHaveLength(0);
  });

  it('GET /.well-known/apple-app-site-association answers the .dev AASA', async () => {
    const res = await fetch(`${url}/.well-known/apple-app-site-association`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applinks: { details: Array<{ appID: string }> } };
    expect(body.applinks.details[0].appID).toContain('com.exafy.maxina.dev');
  });

  it('GET /.well-known/assetlinks.json answers the .dev App Links', async () => {
    const res = await fetch(`${url}/.well-known/assetlinks.json`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ target: { package_name: string } }>;
    expect(body[0].target.package_name).toBe('com.vitanaland.app.dev');
  });

  it('an unknown route answers 404', async () => {
    const res = await fetch(`${url}/api/v1/does-not-exist`);
    expect(res.status).toBe(404);
  });
});
