/** VTID-05157 — the native config never reaches production or staging. */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { assertNotProduction, isBlockedHost, loadConfig, requireUrl, config } from '../src/config/env';

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
