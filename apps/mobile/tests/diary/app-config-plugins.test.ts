/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — plan decision 3 / tasks.md
 * diary task 2 (sparring R1-F1, R2-F1): the resolved Expo config
 * (`APP_PROFILE=development`) registers `expo-image-picker` and `expo-audio`
 * as config plugins with the usage strings from the i18n catalog, and running
 * the registered iOS Info.plist mods (the diary plugins together with
 * withVitanaVoice, in app.config.ts order) yields NSCameraUsageDescription,
 * NSPhotoLibraryUsageDescription and ONE NSMicrophoneUsageDescription — the
 * withVitanaVoice catalog string, which expo-audio is given verbatim, so the
 * key never carries two different values. No background audio.
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExpoConfig } from 'expo/config';
import appConfig, { buildConfig } from '../../app.config';

/* eslint-disable @typescript-eslint/no-require-imports */
const { withPlugins } = require('expo/config-plugins');
const LOCALES = require('../../modules/vitana-voice/plugin/native-locales.json');
/* eslint-enable @typescript-eslint/no-require-imports */

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = (ns: string) => require(join(REPO, 'src/i18n', LOCALES.baseLocale, `${ns}.json`));
const diary = base('diaryNative').diaryNative.permissions as { cameraUsage: string; photosUsage: string };
const mic = base('orbNative').orbNative.micUsageDescription as string;

type Entry = string | [string, Record<string, unknown>];
const VOICE = './modules/vitana-voice/plugin/withVitanaVoice';

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

const entry = (cfg: ExpoConfig, name: string) => (cfg.plugins as Entry[]).find((p) => (Array.isArray(p) ? p[0] : p) === name);

describe('diary capture config plugins (resolved config, APP_PROFILE=development)', () => {
  const cfg = resolved();

  it('registers expo-image-picker with the photo-library and camera usage strings from the catalog', () => {
    expect(entry(cfg, 'expo-image-picker')).toEqual(['expo-image-picker', { photosPermission: diary.photosUsage, cameraPermission: diary.cameraUsage, microphonePermission: mic }]);
    expect(diary.photosUsage.length).toBeGreaterThan(20);
    expect(diary.cameraUsage.length).toBeGreaterThan(20);
  });

  it('registers expo-audio with the one microphone string and no background audio', () => {
    expect(entry(cfg, 'expo-audio')).toEqual(['expo-audio', { microphonePermission: mic, enableBackgroundPlayback: false, enableBackgroundRecording: false }]);
  });

  it('both plugins come after withVitanaVoice, and test-g1 registers them too', () => {
    const names = (cfg.plugins as Entry[]).map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names.indexOf('expo-image-picker')).toBeGreaterThan(names.indexOf(VOICE));
    expect(names.indexOf('expo-audio')).toBeGreaterThan(names.indexOf(VOICE));
    expect(entry(buildConfig('test-g1'), 'expo-audio')).toEqual(entry(cfg, 'expo-audio'));
  });

  it('both are dependencies of the app', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json') as { dependencies: Record<string, string> };
    expect(pkg.dependencies['expo-image-picker']).toMatch(/^57\./);
    expect(pkg.dependencies['expo-audio']).toMatch(/^57\./);
  });
});

describe('the iOS Info.plist the registered plugins write', () => {
  let projectRoot: string;
  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'diary-plugins-'));
  });
  afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

  it('has the camera, photo-library and a single microphone usage description, and no UIBackgroundModes', async () => {
    const cfg = resolved();
    const plugins = (cfg.plugins as Entry[])
      .filter((p) => [VOICE, 'expo-image-picker', 'expo-audio'].includes(Array.isArray(p) ? p[0] : p))
      .map((p) => {
        const [name, props] = Array.isArray(p) ? p : [p, undefined];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(name.startsWith('./') ? join(APP, name) : `${name}/app.plugin`);
        return [mod.default ?? mod, props];
      });
    const config = withPlugins({ name: cfg.name, slug: cfg.slug, _internal: { projectRoot } }, plugins) as ExpoConfig & { mods: { ios: Record<string, (c: unknown) => Promise<{ modResults: Record<string, unknown> }>> } };
    const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'ios'), platform: 'ios', introspect: false };
    // Same hand-over as Expo's mod compiler: dangerous first (withVitanaVoice generates its locale files), then Info.plist.
    const afterDangerous = (await config.mods.ios.dangerous({ ...config, modRequest: { ...modRequest, modName: 'dangerous' }, modResults: {} })) as unknown as Record<string, unknown>;
    const { modResults } = await config.mods.ios.infoPlist({ ...afterDangerous, modRequest: { ...modRequest, modName: 'infoPlist' }, modResults: {} });
    expect(modResults.NSCameraUsageDescription).toBe(diary.cameraUsage);
    expect(modResults.NSPhotoLibraryUsageDescription).toBe(diary.photosUsage);
    expect(modResults.NSMicrophoneUsageDescription).toBe(mic);
    expect(modResults.UIBackgroundModes).toBeUndefined();
  }, 30_000);
});
