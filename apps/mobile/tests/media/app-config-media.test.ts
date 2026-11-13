/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — plan Decision 5, read-only:
 * the Media Hub reuses the packages and plugins already on `main`, so this lane
 * edits no `package.json`, `app.config.ts` or `tests/app-config.test.ts`. This
 * test fails if a later lane drops one of them or turns a camera / microphone
 * option off: `expo-video` (no background playback, no PiP), `expo-audio`
 * (no background playback), `expo-image-picker` and `expo-document-picker`.
 */
import type { ExpoConfig } from 'expo/config';
import { buildConfig } from '../../app.config';

type Entry = string | [string, Record<string, unknown>];
const cfg: ExpoConfig = buildConfig('development', undefined, {});
const plugins = cfg.plugins as Entry[];
const entry = (name: string) => plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../../package.json') as { dependencies: Record<string, string> };

describe('Media Hub plugins and packages (already on main)', () => {
  it('expo-video: inline playback only (no background playback, no picture-in-picture)', () => {
    expect(entry('expo-video')).toEqual(['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]);
  });

  it('expo-audio: no background playback', () => {
    const e = entry('expo-audio') as [string, Record<string, unknown>];
    expect(e[1].enableBackgroundPlayback).toBe(false);
  });

  it('expo-image-picker (video / thumbnail from the library) and expo-document-picker (audio file) are registered', () => {
    expect(entry('expo-image-picker')).toBeTruthy();
    expect(entry('expo-document-picker')).toBeTruthy();
  });

  it('no camera or microphone option is switched off', () => {
    for (const name of ['expo-video', 'expo-audio', 'expo-image-picker', 'expo-document-picker']) {
      const e = entry(name);
      const opts = Array.isArray(e) ? e[1] : {};
      for (const [key, value] of Object.entries(opts)) {
        if (/camera|microphone/i.test(key)) expect(value).not.toBe(false);
      }
    }
  });

  it('all four are dependencies of the app', () => {
    for (const name of ['expo-video', 'expo-audio', 'expo-image-picker', 'expo-document-picker']) {
      expect(pkg.dependencies[name]).toMatch(/^57\./);
    }
  });
});
