/**
 * VTID-05180 — the VitanaVoice config plugin: the microphone usage string comes only
 * from src/i18n (fails closed without it), dev-only local networking, and config
 * evaluation (expo start / export / install --check) never fails on missing keys.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExpoConfig } from 'expo/config';
import { buildConfig } from '../../app.config';

/* eslint-disable @typescript-eslint/no-require-imports */
const withVitanaVoice = require('../../modules/vitana-voice/plugin/withVitanaVoice');
const ios = require('../../modules/vitana-voice/plugin/withVitanaVoiceIos');
const LOCALES = require('../../modules/vitana-voice/plugin/native-locales.json');
/* eslint-enable @typescript-eslint/no-require-imports */

type ModConfig = ExpoConfig & { mods: { ios: Record<string, (c: unknown) => Promise<{ modResults: Record<string, unknown> }>> } };

const SHIPPED = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'];

function fixtureI18n(withKeys: boolean): string {
  const root = mkdtempSync(join(tmpdir(), 'vitana-voice-i18n-'));
  for (const l of SHIPPED) {
    mkdirSync(join(root, l), { recursive: true });
    if (withKeys) {
      writeFileSync(join(root, l, 'orbNative.json'), JSON.stringify({ orbNative: { micUsageDescription: `catalog mic ${l}` } }));
    }
  }
  return root;
}

function apply(profile: string, i18nDir?: string): ModConfig {
  return withVitanaVoice({ name: 'Vitana Dev', slug: 'vitana-mobile' }, { profile, i18nDir }) as ModConfig;
}

type ModResult = { modResults: Record<string, unknown>; locales?: Record<string, string> };

async function runIosMods(config: ModConfig, projectRoot: string, introspect = false) {
  const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'ios'), platform: 'ios', introspect };
  // Same order and hand-over as Expo's mod compiler: dangerous first, its result feeds the next mod.
  const afterDangerous = introspect
    ? (config as unknown as ModResult)
    : ((await config.mods.ios.dangerous({ ...config, modRequest: { ...modRequest, modName: 'dangerous' }, modResults: {} })) as ModResult);
  const afterPlist = (await config.mods.ios.infoPlist({
    ...afterDangerous,
    modRequest: { ...modRequest, modName: 'infoPlist' },
    modResults: {},
  })) as ModResult;
  return { locales: afterDangerous.locales, infoPlist: afterPlist.modResults };
}

describe('withVitanaVoice', () => {
  let projectRoot: string;
  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vitana-voice-project-'));
  });
  afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

  it('is registered in app.config.ts for both profiles with the profile passed through', () => {
    for (const profile of ['development', 'test-g1']) {
      expect(buildConfig(profile).plugins).toContainEqual(['./modules/vitana-voice/plugin/withVitanaVoice', { profile }]);
    }
  });

  it('refuses an unknown profile', () => {
    expect(() => apply('production')).toThrow(/unknown profile/);
  });

  it('evaluates without failing on missing keys and adds no locales (expo export resolves them)', () => {
    const config = apply('development', fixtureI18n(false));
    expect(config.locales).toBeUndefined();
    expect(typeof config.mods.ios.dangerous).toBe('function');
    expect(typeof config.mods.ios.infoPlist).toBe('function');
  });

  it('fails the iOS prebuild closed, with a clear message, when the catalog has no key', async () => {
    const config = apply('development', fixtureI18n(false));
    await expect(runIosMods(config, projectRoot)).rejects.toThrow(/no fallback text[\s\S]*orbNative\.json is missing/);
  });

  it('writes the catalog strings and sets the base Info.plist value from them', async () => {
    const result = await runIosMods(apply('test-g1', fixtureI18n(true)), projectRoot);
    expect(result.infoPlist.NSMicrophoneUsageDescription).toBe('catalog mic en');
    expect(result.infoPlist.NSAppTransportSecurity).toBeUndefined();
    // The locales the xcodeproj mod turns into <lproj>/InfoPlist.strings, for all 11 locales.
    expect(Object.keys(result.locales ?? {}).sort()).toEqual(Object.values(LOCALES.ios as Record<string, string>).sort());
    expect(result.locales?.['sr-Latn']).toBe('./.generated/native-locales/sr-Latn.json');
    const de = JSON.parse(readFileSync(join(projectRoot, ios.OUT_DIR, 'de.json'), 'utf8'));
    expect(de).toEqual({ ios: { NSMicrophoneUsageDescription: 'catalog mic de' } });
  });

  it('introspection (no dangerous mods) still generates and fails closed the same way', async () => {
    const ok = await runIosMods(apply('development', fixtureI18n(true)), projectRoot, true);
    expect(ok.infoPlist.NSMicrophoneUsageDescription).toBe('catalog mic en');
    expect(ok.infoPlist.NSAppTransportSecurity).toEqual({ NSAllowsLocalNetworking: true });
    await expect(runIosMods(apply('development', fixtureI18n(false)), mkdtempSync(join(tmpdir(), 'vv-')), true)).rejects.toThrow(
      /no fallback text/,
    );
  });

  it('allows local networking in the development profile only, and never background audio', () => {
    expect(ios.applyInfoPlist({}, { profile: 'development', micUsageDescription: 'x' }).NSAppTransportSecurity).toEqual({
      NSAllowsLocalNetworking: true,
    });
    const g1 = ios.applyInfoPlist({}, { profile: 'test-g1', micUsageDescription: 'x' });
    expect(g1.NSAppTransportSecurity).toBeUndefined();
    expect(g1.UIBackgroundModes).toBeUndefined();
  });

  it('holds no permission text of its own', () => {
    const dir = join(__dirname, '../../modules/vitana-voice/plugin');
    for (const file of ['withVitanaVoice.js', 'withVitanaVoiceIos.js']) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src).not.toMatch(/NSMicrophoneUsageDescription\s*[:=]\s*['"`]/);
    }
  });
});
