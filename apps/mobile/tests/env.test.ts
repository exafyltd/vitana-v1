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

/**
 * VTID-05186 — the key check behind `src/ports/env` (N1's `assertNotProductionKey`;
 * on this branch its stand-in). Same behaviour either side of the port swap.
 */
describe('Supabase key and endpoints through the env port', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const port = require('../src/ports/env') as typeof import('../src/ports/env');
  const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

  it('refuses the production anon key (legacy JWT ref) and the production sb_publishable_ key', () => {
    expect(() => port.assertNotProductionKey(jwt({ ref: 'inmkhvwdcuyhnxkgfvsb', role: 'anon' }))).toThrow(/production/);
    expect(() => port.assertNotProductionKey('sb_publishable_inmkhvwdcuyhnxkgfvsb_abc')).toThrow(/production/);
    expect(() => port.assertNotProductionKey('not-a-key')).toThrow(/Invalid/);
  });

  it('accepts a G1-shaped key only together with a non-production URL', () => {
    const key = port.assertNotProductionKey(jwt({ ref: 'g1testproject', role: 'anon' }));
    expect(port.endpoints({ gatewayUrl: 'https://g1-gw.example.org', supabaseUrl: 'https://g1testproject.example.org', supabasePublishableKey: key })).toEqual({
      gatewayOrigin: 'https://g1-gw.example.org',
      supabaseUrl: 'https://g1testproject.example.org',
      supabasePublishableKey: key,
    });
    expect(() => port.endpoints({ gatewayUrl: 'https://g1-gw.example.org', supabaseUrl: 'https://inmkhvwdcuyhnxkgfvsb.supabase.co', supabasePublishableKey: key })).toThrow(
      /never reach production or staging/,
    );
  });

  it('endpoints({}) names every missing value; the build config sets none', () => {
    expect(() => port.endpoints({})).toThrow(port.ConfigMissingError);
    try {
      port.endpoints({});
    } catch (e) {
      expect((e as InstanceType<typeof port.ConfigMissingError>).keys).toEqual(['gatewayUrl', 'supabaseUrl', 'supabasePublishableKey']);
    }
    expect(() => port.requireValue({}, 'googleWebClientId')).toThrow(/not set/);
    expect(port.config.supabasePublishableKey).toBeUndefined();
  });
});

// VTID-05183 — the publishable key and endpoints(config).
import { assertNotProductionKey, requireValue, endpoints } from '../src/config/env';

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJl`;
const PROD_REF = 'inmkhvwdcuyhnxkgfvsb';
const G1 = { gatewayUrl: 'https://g1-gateway.example.org', supabaseUrl: 'https://g1-project.example.org', supabasePublishableKey: 'sb_publishable_g1Key123' };

describe('assertNotProductionKey', () => {
  it('refuses a legacy JWT anon key of the production project', () => {
    expect(() => assertNotProductionKey(jwt({ iss: 'supabase', ref: PROD_REF, role: 'anon' }))).toThrow(/production Supabase publishable key/);
    expect(() => loadConfig({ supabasePublishableKey: jwt({ ref: PROD_REF.toUpperCase(), role: 'anon' }) })).toThrow();
  });

  it('accepts a G1-shaped JWT key', () => {
    const key = jwt({ iss: 'supabase', ref: 'g1testprojectref000', role: 'anon' });
    expect(assertNotProductionKey(key)).toBe(key);
  });

  it('refuses an sb_publishable_ key that carries the production ref', () => {
    expect(() => assertNotProductionKey(`sb_publishable_${PROD_REF}_abc123`)).toThrow(/production/);
    expect(() => assertNotProductionKey(`sb_publishable_abc_${PROD_REF}`)).toThrow(/production/);
  });

  it('accepts a G1-shaped sb_publishable_ key', () => {
    expect(assertNotProductionKey('sb_publishable_g1Key123')).toBe('sb_publishable_g1Key123');
  });

  it('refuses a value in neither format', () => {
    for (const bad of ['not-a-key', 'a.b', 'x.y.z!', 'sb_publishable_', 'sb_secret_abc']) {
      expect(() => assertNotProductionKey(bad)).toThrow(/Invalid Supabase publishable key/);
    }
    expect(() => assertNotProductionKey(`${b64url({ alg: 'HS256' })}.@@@.sig`)).toThrow(/Invalid/);
  });
});

describe('endpoints(config)', () => {
  it('returns the checked values', () => {
    expect(endpoints(G1)).toEqual({ gatewayOrigin: G1.gatewayUrl, supabaseUrl: G1.supabaseUrl, supabasePublishableKey: G1.supabasePublishableKey });
    expect(endpoints({ ...G1, dataApiUrl: 'https://g1-data.example.org' }).dataApiUrl).toBe('https://g1-data.example.org');
  });

  it.each(['gatewayUrl', 'supabaseUrl', 'supabasePublishableKey'] as const)('throws when %s is missing', (key) => {
    const cfg: Record<string, string> = { ...G1 };
    delete cfg[key];
    expect(() => endpoints(cfg)).toThrow(/is not set/);
  });

  it('throws for an empty config and for production values', () => {
    expect(() => endpoints({})).toThrow(/is not set/);
    expect(() => endpoints({ ...G1, supabaseUrl: `https://${PROD_REF}.supabase.co` })).toThrow(/never reach production/);
    expect(() => endpoints({ ...G1, supabasePublishableKey: jwt({ ref: PROD_REF }) })).toThrow(/production/);
    expect(() => requireValue({}, 'supabasePublishableKey')).toThrow(/is not set/);
  });
});
