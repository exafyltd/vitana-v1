/**
 * VTID-05248 — shared harness for the G1 Wave-1 exit-path smoke suites.
 *
 * Every suite talks ONLY to the loopback fixture gateway (tools/fixture-gateway,
 * 127.0.0.1): it opens no outbound connection and can never reach staging or
 * production (CLAUDE.md — never test against production). `loopbackFetch`
 * refuses any host other than 127.0.0.1, so a stray real URL fails the test
 * instead of leaving the loopback.
 *
 * The smoke builds its `AppConfig` through the real `resolveProfileConfig`
 * (env.ts), pointing `gatewayUrl` at the running fixture via `EXPO_PUBLIC_*`;
 * loopback is not a blocked host, so `assertNotProduction` passes. No existing
 * module is modified — the smoke only imports them.
 */
import { createFixtureGateway, type FixtureGateway, type FixtureScenario } from '../../tools/fixture-gateway/server';
import { resolveProfileConfig, type AppConfig } from '../../src/config/env';
import type { FetchLike } from '../../src/config/http';

export const SMOKE_SESSION = { accessToken: 'g1-smoke-jwt' };

/** A fetch over node:http that ONLY ever reaches 127.0.0.1. */
export function loopbackFetch(): FetchLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const http = require('http') as typeof import('http');
  return (url: string, init: RequestInit = {}) =>
    new Promise<Response>((resolve, reject) => {
      const u = new URL(url);
      if (u.hostname !== '127.0.0.1') {
        reject(new Error(`g1-smoke loopbackFetch refuses ${u.hostname}: the smoke talks only to the loopback fixture`));
        return;
      }
      const headers = (init.headers ?? {}) as Record<string, string>;
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: init.method ?? 'GET', headers },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            resolve({
              status,
              ok: status >= 200 && status < 300,
              json: async () => JSON.parse(data),
              text: async () => data,
            } as unknown as Response);
          });
        },
      );
      req.on('error', reject);
      if (init.body) req.write(init.body as string);
      req.end();
    });
}

/** Start a loopback fixture gateway with an optional scenario; stop it in afterEach. */
export async function startFixture(scenario?: Partial<FixtureScenario>): Promise<{ gw: FixtureGateway; url: string }> {
  const gw = createFixtureGateway(scenario ? { scenario } : undefined);
  const { url } = await gw.start(0);
  return { gw, url };
}

/**
 * The real config for the `test-g1` profile shape, but with `gatewayUrl`
 * pointed at the running loopback fixture. Built through `resolveProfileConfig`
 * (and therefore `assertNotProduction`), exactly as a build would — no module
 * is modified. The fixture `url` is a `http://127.0.0.1:<port>` loopback host,
 * which is not blocked, so the check passes.
 */
export function smokeConfig(fixtureUrl: string): AppConfig {
  if (new URL(fixtureUrl).hostname !== '127.0.0.1') {
    throw new Error('g1-smoke config must point at the loopback fixture (127.0.0.1)');
  }
  return resolveProfileConfig('test-g1', { gatewayUrl: fixtureUrl });
}
