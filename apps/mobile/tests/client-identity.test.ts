/**
 * VTID-05656 — the native app sends `X-Vitana-Client: native/<platform>/<version>`
 * on every gateway call (and never on a third-party call).
 */
import { execSync } from 'child_process';
import { Platform } from 'react-native';

const mockConfig: { value: unknown } = { value: null };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { get expoConfig() { return mockConfig.value; } },
}));
import {
  CLIENT_HEADER,
  buildClientIdentity,
  clientIdentityHeaders,
  currentClientIdentity,
} from '../src/config/client-identity';
import { fetchWithTimeout, gatewayEndpoint, type FetchLike } from '../src/config/http';

const FORMAT = /^native\/(ios|android|test)\/([0-9A-Za-z][0-9A-Za-z.+_-]{0,31})$/; // the gateway classifier's pattern (VTID-05657)

describe('buildClientIdentity', () => {
  it('builds the value for iOS and Android', () => {
    expect(buildClientIdentity('ios', '1.2.3')).toBe('native/ios/1.2.3');
    expect(buildClientIdentity('android', '10.0.1')).toBe('native/android/10.0.1');
  });
  it('sends unknown when no version is available', () => {
    expect(buildClientIdentity('ios', undefined)).toBe('native/ios/unknown');
    expect(buildClientIdentity('android', '')).toBe('native/android/unknown');
    expect(buildClientIdentity('ios', 'not a version\r\nX-Evil: 1')).toBe('native/ios/unknown');
  });
  it('sends the test platform for anything that is not ios or android', () => {
    expect(buildClientIdentity('web', '1.0.0')).toBe('native/test/1.0.0');
  });
  it('always matches the plan format', () => {
    for (const [p, v] of [['ios', '0.0.0'], ['android', '1.2.3-beta.1'], ['web', undefined]] as const) {
      expect(buildClientIdentity(p, v)).toMatch(FORMAT);
    }
  });
});

describe('currentClientIdentity (test profile)', () => {
  afterEach(() => {
    mockConfig.value = null;
  });
  it('reads Platform.OS and the app version', () => {
    mockConfig.value = { version: '3.4.5' };
    expect(currentClientIdentity()).toBe(`native/${Platform.OS}/3.4.5`);
  });
  it('falls back to unknown without an expo config', () => {
    mockConfig.value = null;
    expect(currentClientIdentity()).toBe(`native/${Platform.OS}/unknown`);
  });
  it('exposes the header map', () => {
    expect(Object.keys(clientIdentityHeaders())).toEqual([CLIENT_HEADER]);
    expect(CLIENT_HEADER).toBe('X-Vitana-Client');
  });
});

describe('gateway calls', () => {
  it('send the header, keep caller headers, and still go out with no version', async () => {
    mockConfig.value = null;
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchImpl: FetchLike = async (url, init) => {
      seen.push({ url, headers: init?.headers as Record<string, string> });
      return new Response('{}', { status: 200 });
    };
    const url = gatewayEndpoint('http://localhost:8080/', '/api/v1/app-config');
    const res = await fetchWithTimeout(fetchImpl, url, { method: 'GET', headers: { Accept: 'application/json' } });
    expect(res.status).toBe(200);
    expect(seen[0].headers.Accept).toBe('application/json');
    expect(seen[0].headers[CLIENT_HEADER]).toMatch(FORMAT);
    expect(seen[0].headers[CLIENT_HEADER]).toMatch(/\/unknown$/);
  });
  it('send the header when no init is given', async () => {
    let headers: Record<string, string> = {};
    await fetchWithTimeout(async (_u, init) => {
      headers = init?.headers as Record<string, string>;
      return new Response('{}');
    }, 'http://localhost:8080/x');
    expect(headers[CLIENT_HEADER]).toMatch(FORMAT);
  });
  it('do not let the caller spoof another identity', async () => {
    let headers: Record<string, string> = {};
    await fetchWithTimeout(async (_u, init) => {
      headers = init?.headers as Record<string, string>;
      return new Response('{}');
    }, 'http://localhost:8080/x', { headers: { 'x-vitana-client': 'web' } });
    expect(Object.keys(headers).filter((k) => k.toLowerCase() === 'x-vitana-client')).toEqual([CLIENT_HEADER]);
  });
});

describe('third-party calls', () => {
  it('do not carry the header: only the gateway helper adds it', async () => {
    const calls: Array<RequestInit | undefined> = [];
    const thirdParty: FetchLike = async (_u, init) => {
      calls.push(init);
      return new Response('{}');
    };
    await thirdParty('https://example.com/file.png');
    expect(calls[0]?.headers).toBeUndefined();
    // The helper is the only importer of the header builder in src.
    const out = execSync("grep -rlE \"client-identity\" src || true", { cwd: __dirname + '/..' }).toString().trim().split('\n').sort();
    expect(out).toEqual(['src/config/client-identity.ts', 'src/config/http.ts']);
  });
});
