/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list, fix round 1) — the
 * resolved Expo config (`APP_PROFILE=development`, and test-g1) registers the
 * Find Friends plugins: `expo-contacts` with the contacts usage string from the
 * i18n catalog (base locale), and `expo-document-picker` with no iCloud
 * container; the app only reads contacts, so WRITE_CONTACTS is blocked.
 * Running the registered iOS Info.plist / entitlements mods and the Android
 * manifest mod shows what a prebuild would write. No live system involved.
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExpoConfig } from 'expo/config';
import appConfig, { CONTACTS_BLOCKED_PERMISSIONS, buildConfig } from '../../../app.config';

/* eslint-disable @typescript-eslint/no-require-imports */
const { withPlugins } = require('expo/config-plugins');
const LOCALES = require('../../../modules/vitana-voice/plugin/native-locales.json');
/* eslint-enable @typescript-eslint/no-require-imports */

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalog = (locale: string) => require(join(REPO, 'src/i18n', locale, 'inboxNative.json')).inboxNative.permissions.contactsUsage as string;
const usage = catalog(LOCALES.baseLocale);

type Entry = string | [string, Record<string, unknown>];
const names = (cfg: ExpoConfig) => (cfg.plugins as Entry[]).map((p) => (Array.isArray(p) ? p[0] : p));
const entry = (cfg: ExpoConfig, name: string) => (cfg.plugins as Entry[]).find((p) => (Array.isArray(p) ? p[0] : p) === name);

function resolved(): ExpoConfig {
  const before = process.env.APP_PROFILE;
  try {
    process.env.APP_PROFILE = 'development';
    return appConfig();
  } finally {
    if (before === undefined) delete process.env.APP_PROFILE;
    else process.env.APP_PROFILE = before;
  }
}

describe('Find Friends config plugins (resolved config)', () => {
  const cfg = resolved();

  it('registers expo-contacts with the catalog usage string and expo-document-picker without options', () => {
    expect(entry(cfg, 'expo-contacts')).toEqual(['expo-contacts', { contactsPermission: usage }]);
    expect(entry(cfg, 'expo-document-picker')).toBe('expo-document-picker');
    expect(usage.length).toBeGreaterThan(40);
    // DE-first: the German string is there and differs from the English one.
    expect(catalog('de')).toMatch(/deine Kontakte/);
    expect(catalog('de')).not.toBe(catalog('en'));
  });

  it('blocks WRITE_CONTACTS (read only) and registers the same plugins for test-g1', () => {
    expect(CONTACTS_BLOCKED_PERMISSIONS).toEqual(['android.permission.WRITE_CONTACTS']);
    expect(cfg.android?.blockedPermissions).toEqual(['android.permission.WRITE_CONTACTS']);
    const g1 = buildConfig('test-g1');
    expect(entry(g1, 'expo-contacts')).toEqual(entry(cfg, 'expo-contacts'));
    expect(names(g1)).toContain('expo-document-picker');
    expect(g1.android?.blockedPermissions).toEqual(['android.permission.WRITE_CONTACTS']);
  });

  it('adds only expo-contacts and expo-document-picker, pinned to the SDK 57 line', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../package.json') as { dependencies: Record<string, string> };
    expect(pkg.dependencies['expo-contacts']).toBe('57.0.8');
    expect(pkg.dependencies['expo-document-picker']).toBe('57.0.3');
    expect(cfg.ios?.usesIcloudStorage).toBeUndefined();
  });
});

describe('what a prebuild writes for them', () => {
  let projectRoot: string;
  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'contacts-plugins-'));
  });
  afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

  const registered = (cfg: ExpoConfig) =>
    (cfg.plugins as Entry[])
      .filter((p) => ['expo-contacts', 'expo-document-picker'].includes(Array.isArray(p) ? p[0] : p))
      .map((p) => {
        const [name, props] = Array.isArray(p) ? p : [p, undefined];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(`${name}/app.plugin`);
        return [mod.default ?? mod, props];
      });

  it('iOS: NSContactsUsageDescription is the catalog string; no iCloud entitlement', async () => {
    const cfg = resolved();
    const config = withPlugins({ name: cfg.name, slug: cfg.slug, ios: cfg.ios, _internal: { projectRoot } }, registered(cfg)) as ExpoConfig & { mods: { ios: Record<string, (c: unknown) => Promise<{ modResults: Record<string, unknown> }>> } };
    const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'ios'), platform: 'ios', introspect: false };
    const plist = await config.mods.ios.infoPlist({ ...config, modRequest: { ...modRequest, modName: 'infoPlist' }, modResults: {} });
    expect(plist.modResults.NSContactsUsageDescription).toBe(usage);
    const ent = await config.mods.ios.entitlements({ ...config, modRequest: { ...modRequest, modName: 'entitlements' }, modResults: {} });
    expect(Object.keys(ent.modResults).filter((k) => /icloud|ubiquity/i.test(k))).toEqual([]);
  });

  it('Android: the plugin asks for READ_CONTACTS (WRITE_CONTACTS is in blockedPermissions above)', async () => {
    const cfg = resolved();
    const config = withPlugins({ name: cfg.name, slug: cfg.slug, android: cfg.android, _internal: { projectRoot } }, registered(cfg)) as ExpoConfig & { mods: { android: Record<string, (c: unknown) => Promise<{ modResults: { manifest: { 'uses-permission'?: Array<{ $: Record<string, string> }> } } }>> } };
    const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'android'), platform: 'android', introspect: false };
    const out = await config.mods.android.manifest({ ...config, modRequest: { ...modRequest, modName: 'manifest' }, modResults: { manifest: { $: {}, application: [] } } });
    const perms = (out.modResults.manifest['uses-permission'] ?? []).map((p) => p.$['android:name']);
    expect(perms).toContain('android.permission.READ_CONTACTS');
  });
});
