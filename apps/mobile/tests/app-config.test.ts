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

/** VTID-05186 (N3, plan change 6) — auth plugins; Google only with a client id. */
describe('auth plugins', () => {
  const names = (env: Record<string, string | undefined>) =>
    (buildConfig('development', env).plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

  it('adds SecureStore and Sign in with Apple, keeps the .dev ids', () => {
    const cfg = buildConfig('development', {});
    expect(names({})).toEqual(['expo-router', 'expo-localization', 'expo-secure-store', 'expo-apple-authentication']);
    expect(cfg.ios?.usesAppleSignIn).toBe(true);
    expect(cfg.ios?.bundleIdentifier).toBe(IDENTIFIERS.ios);
    expect(cfg.scheme).toBe('maxina');
  });

  it('omits Google Sign-In when no iOS client id is set', () => {
    expect(names({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '  ' })).not.toContain('@react-native-google-signin/google-signin');
  });

  it('adds Google Sign-In with the reversed iOS client id', () => {
    const plugins = buildConfig('test-g1', { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123-abc.apps.googleusercontent.com' }).plugins ?? [];
    expect(plugins).toContainEqual(['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.123-abc' }]);
    expect(googleIosUrlScheme(undefined)).toBeNull();
  });
});
