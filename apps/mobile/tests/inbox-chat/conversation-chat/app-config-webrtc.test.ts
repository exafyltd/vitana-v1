/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — task 5:
 * the embedded 1:1 call has a real WebRTC engine. The resolved Expo config
 * (`APP_PROFILE=development`) registers `@config-plugins/react-native-webrtc`
 * with the camera and microphone usage strings the app already writes
 * (`diaryNative.permissions.cameraUsage`, `orbNative.micUsageDescription`),
 * and running every registered iOS Info.plist mod leaves ONE value per key.
 * Both packages are app dependencies. Nothing here starts a call.
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExpoConfig } from 'expo/config';
import appConfig, { buildConfig } from '../../../app.config';

/* eslint-disable @typescript-eslint/no-require-imports */
const { withPlugins } = require('expo/config-plugins');
const LOCALES = require('../../../modules/vitana-voice/plugin/native-locales.json');
/* eslint-enable @typescript-eslint/no-require-imports */

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = (ns: string) => require(join(REPO, 'src/i18n', LOCALES.baseLocale, `${ns}.json`));
const camera = base('diaryNative').diaryNative.permissions.cameraUsage as string;
const mic = base('orbNative').orbNative.micUsageDescription as string;

type Entry = string | [string, Record<string, unknown>];
const WEBRTC = '@config-plugins/react-native-webrtc';
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

describe('WebRTC engine config plugin (resolved config, APP_PROFILE=development)', () => {
  const cfg = resolved();

  it('registers @config-plugins/react-native-webrtc with the existing camera and microphone strings', () => {
    expect(entry(cfg, WEBRTC)).toEqual([WEBRTC, { cameraPermission: camera, microphonePermission: mic }]);
    expect(entry(cfg, 'expo-image-picker')?.[1]).toMatchObject({ cameraPermission: camera, microphonePermission: mic });
  });

  it('test-g1 registers it the same way', () => {
    expect(entry(buildConfig('test-g1'), WEBRTC)).toEqual(entry(cfg, WEBRTC));
  });

  it('react-native-webrtc and its config plugin are pinned app dependencies', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../package.json') as { dependencies: Record<string, string> };
    expect(pkg.dependencies['react-native-webrtc']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies[WEBRTC]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('the iOS Info.plist and Android permissions every registered plugin writes', () => {
  let projectRoot: string;
  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'webrtc-plugins-'));
  });
  afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

  it('one camera and one microphone usage string, the catalog ones; camera + record-audio on Android', async () => {
    const cfg = resolved();
    const plugins = (cfg.plugins as Entry[])
      .filter((p) => [VOICE, 'expo-image-picker', 'expo-audio', WEBRTC].includes(Array.isArray(p) ? p[0] : p))
      .map((p) => {
        const [name, props] = Array.isArray(p) ? p : [p, undefined];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require(name.startsWith('./') ? join(APP, name) : `${name}/app.plugin`);
        return [mod.default ?? mod, props];
      });
    const config = withPlugins({ name: cfg.name, slug: cfg.slug, _internal: { projectRoot } }, plugins) as ExpoConfig & {
      mods: { ios: Record<string, (c: unknown) => Promise<{ modResults: Record<string, unknown> }>> };
    };
    const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'ios'), platform: 'ios', introspect: false };
    const afterDangerous = (await config.mods.ios.dangerous({ ...config, modRequest: { ...modRequest, modName: 'dangerous' }, modResults: {} })) as unknown as Record<string, unknown>;
    const { modResults } = await config.mods.ios.infoPlist({ ...afterDangerous, modRequest: { ...modRequest, modName: 'infoPlist' }, modResults: {} });
    expect(modResults.NSCameraUsageDescription).toBe(camera);
    expect(modResults.NSMicrophoneUsageDescription).toBe(mic);
    expect(modResults.UIBackgroundModes).toBeUndefined();
    const perms = (config as unknown as { _internal?: unknown; android?: { permissions?: string[] } }).android?.permissions ?? [];
    expect(perms).toEqual(expect.arrayContaining(['android.permission.CAMERA', 'android.permission.RECORD_AUDIO']));
  }, 30_000);
});

describe('chat media parity packages (fix 1, driver decision)', () => {
  const cfg = resolved();

  it('registers expo-video without background playback or PiP, and the date-time picker', () => {
    expect(entry(cfg, 'expo-video')).toEqual(['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]);
    expect(entry(cfg, '@react-native-community/datetimepicker')).toBe('@react-native-community/datetimepicker');
    expect(entry(buildConfig('test-g1'), 'expo-video')).toEqual(entry(cfg, 'expo-video'));
  });

  it('expo-clipboard, expo-video, expo-document-picker and the date-time picker are pinned dependencies', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../package.json') as { dependencies: Record<string, string> };
    for (const name of ['expo-clipboard', 'expo-video', 'expo-document-picker', '@react-native-community/datetimepicker']) expect(pkg.dependencies[name]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('running every iOS Info.plist mod keeps one camera / microphone string and adds no background mode', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'chat-media-plugins-'));
    try {
      const plugins = (cfg.plugins as Entry[])
        .filter((p) => [VOICE, 'expo-image-picker', 'expo-audio', WEBRTC, 'expo-video', '@react-native-community/datetimepicker'].includes(Array.isArray(p) ? p[0] : p))
        .map((p) => {
          const [name, props] = Array.isArray(p) ? p : [p, undefined];
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require(name.startsWith('./') ? join(APP, name) : `${name}/app.plugin`);
          return [mod.default ?? mod, props];
        });
      const config = withPlugins({ name: cfg.name, slug: cfg.slug, _internal: { projectRoot } }, plugins) as ExpoConfig & {
        mods: { ios: Record<string, (c: unknown) => Promise<{ modResults: Record<string, unknown> }>> };
      };
      const modRequest = { projectRoot, platformProjectRoot: join(projectRoot, 'ios'), platform: 'ios', introspect: false };
      const afterDangerous = (await config.mods.ios.dangerous({ ...config, modRequest: { ...modRequest, modName: 'dangerous' }, modResults: {} })) as unknown as Record<string, unknown>;
      const { modResults } = await config.mods.ios.infoPlist({ ...afterDangerous, modRequest: { ...modRequest, modName: 'infoPlist' }, modResults: {} });
      expect(modResults.NSCameraUsageDescription).toBe(camera);
      expect(modResults.NSMicrophoneUsageDescription).toBe(mic);
      expect(modResults.UIBackgroundModes ?? []).not.toContain('audio');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
