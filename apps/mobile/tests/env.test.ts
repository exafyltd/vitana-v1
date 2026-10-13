/** VTID-05157 — the native config never reaches production or staging. */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { assertNotProduction, isBlockedHost, loadConfig, requireUrl, config, ConfigMissingError, missingKeys } from '../src/config/env';

const BLOCKED = [
  'https://gateway.vitanaland.com',
  'https://gateway.vitanaland.com/api/v1/alive',
  'https://GATEWAY.vitanaland.com.',
  'https://gateway.vitanaland.com:8443/x',
  'https://vitanaland.com',
  'https://www.vitanaland.com/home',
  'https://inmkhvwdcuyhnxkgfvsb.supabase.co',
  'https://inmkhvwdcuyhnxkgfvsb.supabase.co/rest/v1/profiles',
  'https://preview-aws.vitanaland.com',
  'https://preview-aws-gateway.vitanaland.com',
];

describe('production and staging hosts', () => {
  it.each(BLOCKED)('rejects %s', (url) => {
    expect(isBlockedHost(url)).toBe(true);
    expect(() => assertNotProduction(url)).toThrow(/never reach production or staging/);
    expect(() => loadConfig({ gatewayUrl: url })).toThrow();
    expect(() => requireUrl({ supabaseUrl: url }, 'supabaseUrl')).toThrow();
  });

  it('accepts a non-production host', () => {
    expect(assertNotProduction('http://localhost:8080')).toBe('http://localhost:8080');
    expect(loadConfig({ gatewayUrl: 'https://g1-test.example.org' })).toEqual({ gatewayUrl: 'https://g1-test.example.org' });
  });

  it('rejects a value that is not a URL', () => {
    expect(() => assertNotProduction('gateway.vitanaland.com')).toThrow(/Invalid URL/);
  });
});

describe('no fallback', () => {
  it('an unset value throws and never falls back', () => {
    expect(() => requireUrl({}, 'gatewayUrl')).toThrow(/not set/);
    expect(() => requireUrl({}, 'supabaseUrl')).toThrow(/not set/);
    expect(() => requireUrl({}, 'dataApiUrl')).toThrow(/not set/);
    expect(loadConfig({ gatewayUrl: '   ' })).toEqual({});
  });

  it('is empty in Wave 0 (no EXPO_PUBLIC_* set)', () => {
    expect(config).toEqual({});
  });

  it('src/config holds no production or staging URL literal', () => {
    const dir = join(__dirname, '../src/config');
    for (const file of readdirSync(dir)) {
      const text = readFileSync(join(dir, file), 'utf8');
      for (const url of text.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
        expect(`${file}: ${url} blocked=${isBlockedHost(url)}`).toBe(`${file}: ${url} blocked=false`);
      }
    }
  });
});

/** VTID-05186 (N3, plan change 5) — the shell's own keys. */
describe('authRedirectUrl, webBaseUrl and the Google client ids', () => {
  it.each(BLOCKED)('refuses %s as authRedirectUrl and webBaseUrl', (url) => {
    expect(() => loadConfig({ authRedirectUrl: url })).toThrow(/never reach production or staging/);
    expect(() => loadConfig({ webBaseUrl: url })).toThrow(/never reach production or staging/);
    expect(() => requireUrl({ webBaseUrl: url }, 'webBaseUrl')).toThrow();
  });

  it('accepts G1-shaped values and keeps the client ids as plain values', () => {
    expect(
      loadConfig({
        authRedirectUrl: 'https://g1-test.example.org',
        webBaseUrl: 'https://g1-web.example.org',
        googleWebClientId: ' 1-web.apps.googleusercontent.com ',
        googleIosClientId: '',
      }),
    ).toEqual({
      authRedirectUrl: 'https://g1-test.example.org',
      webBaseUrl: 'https://g1-web.example.org',
      googleWebClientId: '1-web.apps.googleusercontent.com',
    });
  });

  it('an unset key is a ConfigMissingError naming the key, never a fallback', () => {
    let error: unknown;
    try {
      requireUrl({}, 'authRedirectUrl');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConfigMissingError);
    expect((error as ConfigMissingError).keys).toEqual(['authRedirectUrl']);
    expect(missingKeys({ webBaseUrl: 'https://g1-web.example.org' }, ['webBaseUrl', 'authRedirectUrl', 'googleWebClientId'])).toEqual([
      'authRedirectUrl',
      'googleWebClientId',
    ]);
  });

  it('src/ holds no production or staging URL literal outside the blocked-host list', () => {
    const root = join(__dirname, '../src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        if (name.isDirectory()) walk(join(dir, name.name));
        else if (/\.(ts|tsx)$/.test(name.name) && !name.name.endsWith('.generated.ts')) files.push(join(dir, name.name));
      }
    };
    walk(root);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const url of text.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
        let blocked = false;
        try {
          blocked = isBlockedHost(url);
        } catch {
          blocked = false;
        }
        expect(`${file}: ${url} blocked=${blocked}`).toBe(`${file}: ${url} blocked=false`);
      }
    }
  });
});
