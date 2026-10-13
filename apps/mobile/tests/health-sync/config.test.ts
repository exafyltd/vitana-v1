/**
 * @jest-environment node
 *
 * VTID-05184 — config plugins (N5a plan change 4, Tests "Config"): HealthKit
 * read-only with background delivery and no clinical access; the purpose
 * string from the N5b catalogue key in all 11 locales (fail closed when
 * absent); the Health Connect READ permission set = the catalogue's; minSdk 26;
 * SQLCipher; the existing Wave 0 assertions stay green (tests/app-config.test.ts).
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildConfig, HEALTH_SYNC_PLUGINS } from '../../app.config';
import { CATALOGUE_V1, HC_BACKGROUND_PERMISSION, HC_HISTORY_PERMISSION, HC_READ_PERMISSION } from '../../src/health-sync/contract/v1/catalogue';
import { rationaleTarget } from '../../modules/health-connect-rationale';

/* eslint-disable @typescript-eslint/no-require-imports */
const strings = require('../../plugins/health-strings.js');
const iosLocales = require('../../plugins/with-ios-health-locales.js');
const hcPerms = require('../../plugins/with-health-connect-permissions.js');
const { compileModsAsync } = require('expo/config-plugins');
const { withConfigPlugins } = require('@expo/config/build/plugins/withConfigPlugins');
/* eslint-enable @typescript-eslint/no-require-imports */

const MOBILE = join(__dirname, '../..');
const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'];

function fixtureI18n(locales = LOCALES, value = (l: string) => `${l}: Vitana liest "Health" nur nach deiner Zustimmung.`) {
  const dir = mkdtempSync(join(tmpdir(), 'n5a-i18n-'));
  for (const l of LOCALES) {
    mkdirSync(join(dir, l));
    const body = locales.includes(l) ? { screens: { nativeHealthSync: { osPermission: { iosShareUsage: value(l), privacyPolicyTitle: 'x' } } } } : { screens: {} };
    writeFileSync(join(dir, l, 'screens.json'), JSON.stringify(body));
    writeFileSync(join(dir, l, 'common.json'), JSON.stringify({ common: { ok: 'ok' } }));
  }
  return dir;
}

describe.each(['development', 'test-g1'])('profile %s', (profile) => {
  const cfg = buildConfig(profile);
  const plugins = cfg.plugins as unknown[];
  const entry = (name: string) => plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);

  it('keeps the Wave 0 plugins and adds the Health Sync plugins', () => {
    expect(plugins.slice(0, 2)).toEqual(['expo-router', 'expo-localization']);
    expect(plugins.slice(2)).toEqual(HEALTH_SYNC_PLUGINS);
  });
  it('HealthKit: read-only (no update string), background delivery on, no clinical-records access', () => {
    expect(entry('@kingstinct/react-native-healthkit')).toEqual(['@kingstinct/react-native-healthkit', { NSHealthShareUsageDescription: true, NSHealthUpdateUsageDescription: false, background: true }]);
    expect(JSON.stringify(cfg)).not.toMatch(/healthkit\.access|health-records/);
  });
  it('Android minSdk 26 (native build only), SQLCipher on, background task', () => {
    expect(entry('expo-build-properties')).toEqual(['expo-build-properties', { android: { minSdkVersion: 26 } }]);
    expect(entry('expo-sqlite')).toEqual(['expo-sqlite', { useSQLCipher: true }]);
    expect(entry('expo-background-task')).toBe('expo-background-task');
    expect(entry('react-native-health-connect')).toBe('react-native-health-connect');
  });
  it('still no production profile, .dev identifiers, no googleServicesFile, no user-visible string in the config', () => {
    expect(cfg.ios?.bundleIdentifier).toMatch(/\.dev$/);
    expect(cfg.android?.package).toMatch(/\.dev$/);
    expect(JSON.stringify(cfg)).not.toMatch(/googleServicesFile|UsageDescription":"/);
  });
});

describe('Health Connect permissions', () => {
  it('= the catalogue READ permissions + history + background, and no WRITE_', () => {
    const fromCatalogue = [...new Set(CATALOGUE_V1.map((e) => e.hcRecordType).filter(Boolean).map((t) => HC_READ_PERMISSION[t!]))].sort();
    expect([...hcPerms.READ_PERMISSIONS].sort()).toEqual(fromCatalogue);
    expect(hcPerms.EXTRA_PERMISSIONS).toEqual([HC_HISTORY_PERMISSION, HC_BACKGROUND_PERMISSION]);
    const manifest = hcPerms.applyHealthConnectManifest({ manifest: { $: {}, 'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }] } });
    const names = manifest.manifest['uses-permission'].map((p: { $: Record<string, string> }) => p.$['android:name']);
    expect(names).toEqual(['android.permission.INTERNET', ...hcPerms.READ_PERMISSIONS, ...hcPerms.EXTRA_PERMISSIONS]);
    expect(names.some((n: string) => /WRITE_/.test(n))).toBe(false);
    expect(manifest.manifest.queries[0].package).toEqual([{ $: { 'android:name': 'com.google.android.apps.healthdata' } }]);
    // idempotent
    const again = hcPerms.applyHealthConnectManifest(manifest);
    expect(again.manifest['uses-permission']).toHaveLength(names.length);
    expect(again.manifest.queries[0].package).toHaveLength(1);
  });
});

describe('HealthKit purpose string from the catalogue (N5b keys)', () => {
  it('resolves all 11 locales from the catalogue', () => {
    const out = strings.resolveHealthStrings({ i18nDir: fixtureI18n() });
    expect(Object.keys(out)).toEqual(LOCALES);
    expect(out.ar.NSHealthShareUsageDescription).toBe('ar: Vitana liest "Health" nur nach deiner Zustimmung.');
  });
  it('fails closed, naming the key and every locale without it (no German or English fallback)', () => {
    expect(() => strings.resolveHealthStrings({ i18nDir: fixtureI18n(LOCALES.filter((l) => l !== 'tr' && l !== 'zh')) })).toThrow(
      /screens\.nativeHealthSync\.osPermission\.iosShareUsage" is missing or empty in tr, zh .*N5b \(VTID-05185/,
    );
    expect(() => strings.resolveHealthStrings({ i18nDir: fixtureI18n(LOCALES, (l) => (l === 'de' ? '  ' : 'x')) })).toThrow(/missing or empty in de /);
  });
  it('the real catalogue: all 11 locales resolve once N5b is merged, otherwise the build fails closed', () => {
    let resolved: Record<string, unknown> | null = null;
    try {
      resolved = strings.resolveHealthStrings();
    } catch (err) {
      expect((err as Error).message).toMatch(/Health Sync \(VTID-05184\).*iosShareUsage.*N5b \(VTID-05185/);
    }
    if (resolved) expect(Object.keys(resolved)).toEqual(LOCALES);
  });
  it('InfoPlist.strings values are escaped and written for every locale', () => {
    const root = mkdtempSync(join(tmpdir(), 'n5a-root-'));
    const files = iosLocales.writeLocaleFiles(root, strings.resolveHealthStrings({ i18nDir: fixtureI18n() }));
    expect(files).toHaveLength(11);
    const de = JSON.parse(readFileSync(join(root, '.generated/ios-locales/de.json'), 'utf8'));
    expect(de).toEqual({ NSHealthShareUsageDescription: 'de: Vitana liest \\"Health\\" nur nach deiner Zustimmung.' });
    expect(iosLocales.withLocaleEntries({}).locales.sr).toBe('.generated/ios-locales/sr.json');
  });
});

describe('the iOS locales mod', () => {
  it('writes the 11 files and only then points `locales` at them (config evaluation never needs them)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'n5a-prebuild-'));
    const base = { name: 'x', slug: 'x' };
    const cfg = iosLocales(base, { i18nDir: fixtureI18n() });
    expect(cfg.locales).toBeUndefined();
    const out = await cfg.mods.ios.dangerous({ ...cfg, modResults: null, modRequest: { projectRoot: root, platformProjectRoot: join(root, 'ios'), platform: 'ios', modName: 'dangerous', introspect: false } });
    expect(Object.keys(out.locales)).toEqual(LOCALES);
    for (const l of LOCALES) expect(JSON.parse(readFileSync(join(root, out.locales[l]), 'utf8')).NSHealthShareUsageDescription).toContain(`${l}:`);
  });
});

describe('prebuild introspection (no native project written)', () => {
  async function introspect(i18nDir: string) {
    const cfg = buildConfig('development');
    cfg.plugins = (cfg.plugins as unknown[]).map((p) => (p === './plugins/with-ios-health-locales.js' ? ['./plugins/with-ios-health-locales.js', { i18nDir }] : p)) as typeof cfg.plugins;
    const withPlugins = withConfigPlugins({ ...cfg, _internal: { projectRoot: MOBILE } }, false);
    return compileModsAsync(withPlugins, { projectRoot: MOBILE, platforms: ['ios', 'android'], introspect: true, assertMissingModProviders: false });
  }
  it('Info.plist, entitlements and AndroidManifest come out as specified', async () => {
    const out = await introspect(fixtureI18n());
    const mods = out._internal.modResults;
    expect(mods.ios.infoPlist.NSHealthShareUsageDescription).toBe('en: Vitana liest "Health" nur nach deiner Zustimmung.');
    expect(mods.ios.infoPlist.NSHealthUpdateUsageDescription).toBeUndefined();
    expect(mods.ios.entitlements['com.apple.developer.healthkit']).toBe(true);
    expect(mods.ios.entitlements['com.apple.developer.healthkit.background-delivery']).toBe(true);
    expect(mods.ios.entitlements['com.apple.developer.healthkit.access']).toBeUndefined();
    const manifest = mods.android.manifest.manifest;
    const names = manifest['uses-permission'].map((p: { $: Record<string, string> }) => p.$['android:name']);
    for (const p of [...hcPerms.READ_PERMISSIONS, ...hcPerms.EXTRA_PERMISSIONS]) expect(names).toContain(p);
    expect(names.filter((n: string) => n.startsWith('android.permission.health.WRITE_'))).toEqual([]);
    const main = manifest.application[0].activity.find((a: { $: Record<string, string> }) => a.$['android:name'] === '.MainActivity');
    expect(JSON.stringify(main['intent-filter'])).toContain('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE');
    expect(JSON.stringify(manifest.application[0]['activity-alias'])).toContain('android.intent.action.VIEW_PERMISSION_USAGE');
  }, 60_000);
  it('fails closed when the N5b key is missing', async () => {
    await expect(introspect(fixtureI18n(['de']))).rejects.toThrow(/missing or empty in en, es, sr, fr, pl, pt, ru, tr, zh, ar/);
  }, 60_000);
});

describe('Health Connect rationale hand-off', () => {
  it('both rationale intents open /privacy; anything else does nothing', () => {
    expect(rationaleTarget('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE')).toBe('/privacy');
    expect(rationaleTarget('android.intent.action.VIEW_PERMISSION_USAGE')).toBe('/privacy');
    expect(rationaleTarget('android.intent.action.MAIN')).toBeNull();
    expect(rationaleTarget(null)).toBeNull();
  });
  it('the Kotlin module and the plugins hold no user-visible string', () => {
    const kt = readFileSync(join(MOBILE, 'modules/health-connect-rationale/android/src/main/java/expo/modules/healthconnectrationale/HealthConnectRationaleModule.kt'), 'utf8');
    const literals = [...kt.replace(/\/\/.*$/gm, '').matchAll(/"([^"\n]*)"/g)].map((m) => m[1]);
    expect(literals).toEqual(['HealthConnectRationale', 'getLaunchAction']);
    for (const f of ['with-ios-health-locales.js', 'with-health-connect-permissions.js']) {
      expect(readFileSync(join(MOBILE, 'plugins', f), 'utf8')).not.toMatch(/wants to (read|update)/);
    }
  });
});
