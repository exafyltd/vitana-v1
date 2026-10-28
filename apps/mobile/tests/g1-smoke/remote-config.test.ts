/**
 * VTID-05248 — G1 Wave-1 exit path, smoke (a): remote config, OFFLINE against
 * the loopback fixture gateway.
 *
 * A signed-in member's build fetches `GET /api/v1/app-config` from the fixture
 * through the REAL `createRemoteConfigClient` (remote-config.ts) over the
 * loopback fetch, and:
 *  - `push_enabled` comes back ON (source `remote`), so the Wave-1 push path is
 *    unlocked;
 *  - a HIGH `min_supported_version` makes `deriveView(...).updateRequired` true,
 *    proving the update gate the shell reads.
 *
 * No module is modified; the smoke only imports them. Every call is to
 * 127.0.0.1 — `loopbackFetch` refuses any other host.
 */
import {
  createRemoteConfigClient,
  deriveView,
  type RemoteConfigClient,
} from '../../src/config/remote-config';
import { createMemoryStore } from '../../src/config/kv-store';
import type { FixtureGateway } from '../../tools/fixture-gateway/server';
import { loopbackFetch, smokeConfig, startFixture } from './helpers';

const PUSH_ON = { push_enabled: true, health_sync_enabled: false, orb_native_enabled: false };

describe('G1 smoke (a) — remote config over the loopback fixture', () => {
  let gw: FixtureGateway;
  let url: string;
  let client: RemoteConfigClient;

  afterEach(async () => {
    await gw.stop();
  });

  function build(): RemoteConfigClient {
    return createRemoteConfigClient({
      config: smokeConfig(url),
      platform: 'ios',
      store: createMemoryStore(),
      fetchImpl: loopbackFetch(),
      now: () => 1_000_000,
    });
  }

  it('push_enabled comes back ON from the fixture (source remote)', async () => {
    ({ gw, url } = await startFixture({
      appConfig: {
        schemaVersion: 1,
        ttlSeconds: 300,
        flags: PUSH_ON,
        minSupportedVersion: '0.0.0',
        recommendedVersion: null,
        updateUrl: null,
      },
    }));
    client = build();

    const state = await client.refresh();
    expect(state.source).toBe('remote');
    expect(state.platformConfig.flags.push_enabled).toBe(true);

    const view = deriveView(state, '1.0.0');
    expect(view.source).toBe('remote');
    expect(view.flags.push_enabled).toBe(true);
    expect(view.updateRequired).toBe(false);

    // Talked only to the loopback fixture.
    expect(url.startsWith('http://127.0.0.1:')).toBe(true);
    expect(gw.requests.some((r) => r.method === 'GET' && r.path === '/api/v1/app-config')).toBe(true);
  });

  it('a HIGH min_supported_version makes updateRequired true', async () => {
    ({ gw, url } = await startFixture({
      appConfig: {
        schemaVersion: 1,
        ttlSeconds: 300,
        flags: PUSH_ON,
        minSupportedVersion: '99.0.0',
        recommendedVersion: null,
        updateUrl: 'https://apps.example.test/maxina',
      },
    }));
    client = build();

    const state = await client.refresh();
    expect(state.source).toBe('remote');
    expect(state.platformConfig.min_supported_version).toBe('99.0.0');

    // The running app version (0.0.0) is below the floor → update required.
    const view = deriveView(state, '1.0.0');
    expect(view.updateRequired).toBe(true);
    expect(view.updateUrl).toBe('https://apps.example.test/maxina');
    // push_enabled is still on even when an update is required.
    expect(view.flags.push_enabled).toBe(true);
  });
});
