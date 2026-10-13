/** VTID-05157 — app.config.ts has no production profile and no store identifiers. */
import { buildConfig, resolveProfile, IDENTIFIERS } from '../app.config';
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
