/** VTID-05157 — app.config.ts has no production profile and no store identifiers. */
import { buildConfig, resolveProfile, IDENTIFIERS, googleIosUrlScheme } from '../app.config';
import appConfig from '../app.config';

describe('APP_PROFILE', () => {
  it('throws when unset', () => {
    expect(() => resolveProfile(undefined)).toThrow(/not set/);
    expect(() => resolveProfile('')).toThrow(/not set/);
  });
  it('throws for production', () => {
    expect(() => resolveProfile('production')).toThrow(/does not exist in Wave 0/);
  });
  it('throws for an unknown profile', () => {
    expect(() => resolveProfile('staging')).toThrow(/Unknown APP_PROFILE/);
  });
  it('the default export reads APP_PROFILE', () => {
    const before = process.env.APP_PROFILE;
    try {
      delete process.env.APP_PROFILE;
      expect(() => appConfig()).toThrow(/not set/);
      process.env.APP_PROFILE = 'production';
      expect(() => appConfig()).toThrow();
      process.env.APP_PROFILE = 'development';
      expect(appConfig().extra?.profile).toBe('development');
    } finally {
      if (before === undefined) delete process.env.APP_PROFILE;
      else process.env.APP_PROFILE = before;
    }
  });
});

describe.each(['development', 'test-g1'])('profile %s', (profile) => {
  const cfg = buildConfig(profile);
  it('uses .dev identifiers, never the store ones', () => {
    expect(cfg.ios?.bundleIdentifier).toBe(IDENTIFIERS.ios);
    expect(cfg.android?.package).toBe(IDENTIFIERS.android);
    expect(cfg.ios?.bundleIdentifier).toMatch(/\.dev$/);
    expect(cfg.android?.package).toMatch(/\.dev$/);
    expect(cfg.ios?.bundleIdentifier).not.toBe('com.exafy.maxina');
    expect(cfg.android?.package).not.toBe('com.vitanaland.app');
  });
  it('has no googleServicesFile', () => {
    expect(JSON.stringify(cfg)).not.toMatch(/googleServicesFile/);
  });
});

/** VTID-05178 (N4-APP Change 13) — associated domains per build profile, G1 host only. */
describe('APP_LINK_HOSTS', () => {
  it.each(['development', 'test-g1'])('unset gives no association for %s', (profile) => {
    const cfg = buildConfig(profile, undefined);
    expect(cfg.ios?.associatedDomains).toBeUndefined();
    expect(cfg.android?.intentFilters).toBeUndefined();
    expect(cfg.extra?.linkHosts).toEqual([]);
    expect(buildConfig(profile, ' , ').ios?.associatedDomains).toBeUndefined();
  });

  it('test-g1 maps the G1 host to associatedDomains and verified intentFilters for the four paths', () => {
    const cfg = buildConfig('test-g1', 'g1-test.example.org');
    expect(cfg.ios?.associatedDomains).toEqual(['applinks:g1-test.example.org']);
    expect(cfg.extra?.linkHosts).toEqual(['g1-test.example.org']);
    const filters = cfg.android?.intentFilters ?? [];
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({ action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'] });
    expect(filters[0].data).toEqual([
      { scheme: 'https', host: 'g1-test.example.org', path: '/auth/confirmed' },
      { scheme: 'https', host: 'g1-test.example.org', path: '/reset-password' },
      { scheme: 'https', host: 'g1-test.example.org', path: '/oauth/complete' },
      { scheme: 'https', host: 'g1-test.example.org', pathPrefix: '/i/' },
    ]);
  });

  it('development never associates', () => {
    expect(() => buildConfig('development', 'g1-test.example.org')).toThrow(/only for the test-g1 profile/);
  });

  it.each([
    'vitanaland.com',
    'www.vitanaland.com',
    'gateway.vitanaland.com',
    'preview-aws.vitanaland.com',
    'preview-aws-gateway.vitanaland.com',
    'g1-test.example.org,VITANALAND.COM',
  ])('a production or staging host fails the build: %s', (hosts) => {
    expect(() => buildConfig('test-g1', hosts)).toThrow(/never associate with a production or staging host/);
  });

  it.each(['https://g1-test.example.org', 'g1-test.example.org/path', 'localhost', 'g1 test.org'])('rejects a value that is not a bare hostname: %s', (hosts) => {
    expect(() => buildConfig('test-g1', hosts)).toThrow(/not a bare hostname/);
  });

  it('the default export reads APP_LINK_HOSTS', () => {
    const before = { profile: process.env.APP_PROFILE, hosts: process.env.APP_LINK_HOSTS };
    try {
      process.env.APP_PROFILE = 'test-g1';
      process.env.APP_LINK_HOSTS = 'preview-aws.vitanaland.com';
      expect(() => appConfig()).toThrow();
      process.env.APP_LINK_HOSTS = 'g1-test.example.org';
      expect(appConfig().ios?.associatedDomains).toEqual(['applinks:g1-test.example.org']);
    } finally {
      for (const [k, v] of [['APP_PROFILE', before.profile], ['APP_LINK_HOSTS', before.hosts]] as const) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe.each(['development', 'test-g1'])('profile %s (VTID-05178)', (profile) => {
  const cfg = buildConfig(profile, profile === 'test-g1' ? 'g1-test.example.org' : undefined);
  it('has no Firebase plugin and no google-services file (G2)', () => {
    const text = JSON.stringify(cfg);
    expect(text).not.toMatch(/googleServicesFile|GoogleService-Info|google-services/);
    expect(text).not.toMatch(/firebase/i);
    expect(text).not.toMatch(/expo-notifications/);
  });
  it('keeps the maxina custom scheme', () => {
    expect(cfg.scheme).toBe('maxina');
  });
});

describe('package.json (VTID-05178 Change 8)', () => {
  it('adds no push or Firebase dependency', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../package.json') as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter((n) => /firebase|expo-notifications|onesignal|^zod$/.test(n))).toEqual([]);
  });
});

/** VTID-05186 (N3, plan change 6) — auth plugins; Google only with a client id. */
describe('auth plugins', () => {
  const names = (env: Record<string, string | undefined>) =>
    (buildConfig('development', undefined, env).plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

  it('adds SecureStore and Sign in with Apple, keeps the .dev ids', () => {
    const cfg = buildConfig('development', undefined, {});
    expect(names({})).toEqual(['expo-router', 'expo-localization', 'expo-secure-store', 'expo-apple-authentication']);
    expect(cfg.ios?.usesAppleSignIn).toBe(true);
    expect(cfg.ios?.bundleIdentifier).toBe(IDENTIFIERS.ios);
    expect(cfg.scheme).toBe('maxina');
  });

  it('omits Google Sign-In when no iOS client id is set', () => {
    expect(names({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '  ' })).not.toContain('@react-native-google-signin/google-signin');
  });

  it('adds Google Sign-In with the reversed iOS client id', () => {
    const plugins = buildConfig('test-g1', undefined, { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123-abc.apps.googleusercontent.com' }).plugins ?? [];
    expect(plugins).toContainEqual(['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.123-abc' }]);
    expect(googleIosUrlScheme(undefined)).toBeNull();
  });
});
