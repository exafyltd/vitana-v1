/**
 * VTID-05181 — static checks of the Android sources that run in the jest job (the Kotlin unit
 * and Robolectric tests run in the NATIVE-CI `android-module` job):
 *   - the Kotlin module exposes exactly the JS interface (name, events, functions, sync/async);
 *   - its capability report has exactly the facade's keys and only Android AEC paths;
 *   - no AEC ⇒ half duplex: the promotion allowlist is empty and varispeed is the default mode;
 *   - rules 41 / 42a: no OS text-to-speech, no voice id, no audio clip in the module.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { NATIVE_FUNCTIONS, NATIVE_MODULE_NAME, SAFE_CAPABILITIES, VOICE_EVENTS } from '../../modules/vitana-voice/src/VitanaVoice';

const MODULE_DIR = join(__dirname, '../../modules/vitana-voice');
const KT_DIR = join(MODULE_DIR, 'android/src/main/java/expo/modules/vitanavoice');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'build' || name === 'node_modules' ? [] : walk(full);
    return [full];
  });
}

const read = (file: string) => readFileSync(file, 'utf8');
const moduleKt = read(join(KT_DIR, 'VitanaVoiceModule.kt'));
const capabilitiesKt = read(join(KT_DIR, 'core/Capabilities.kt'));
const rateKt = read(join(KT_DIR, 'core/PlaybackRate.kt'));

describe('Kotlin ↔ JS contract', () => {
  it('registers the module under the JS name', () => {
    expect(moduleKt).toContain(`Name("${NATIVE_MODULE_NAME}")`);
  });

  it('declares exactly the interface events, in order, and sends each', () => {
    const consts = Object.fromEntries([...moduleKt.matchAll(/const val (\w+) = "(on\w+)"/g)].map((m) => [m[1], m[2]]));
    const all = /val ALL = arrayOf\(([^)]*)\)/.exec(moduleKt)?.[1].split(',').map((s) => consts[s.trim()]);
    expect(all).toEqual([...VOICE_EVENTS]);
    expect(moduleKt).toContain('Events(*VoiceEvents.ALL)');
    for (const name of Object.keys(consts)) expect(moduleKt).toContain(`sendEvent(VoiceEvents.${name}`);
  });

  it('declares exactly the interface functions, async where the interface returns a Promise', () => {
    const found: Record<string, string> = {};
    for (const m of moduleKt.matchAll(/\b(AsyncFunction|Function)\("([^"]+)"\)/g)) {
      found[m[2]] = m[1] === 'AsyncFunction' ? 'async' : 'sync';
    }
    expect(found).toEqual({ ...NATIVE_FUNCTIONS });
  });

  it('is autolinked for Android', () => {
    const config = JSON.parse(read(join(MODULE_DIR, 'expo-module.config.json')));
    expect(config.platforms).toContain('android');
    expect(config.android.modules).toEqual(['expo.modules.vitanavoice.VitanaVoiceModule']);
  });

  it('reports exactly the facade capability keys', () => {
    const keys = [...(/fun toMap\(\)[^]*?mapOf\(([^]*?)\n {2}\)/.exec(capabilitiesKt)?.[1] ?? '').matchAll(/"(\w+)" to/g)].map((m) => m[1]);
    expect(keys.sort()).toEqual(Object.keys(SAFE_CAPABILITIES).sort());
    expect(capabilitiesKt).toContain('const val AEC_PATH_ANDROID = "android-aec"');
    expect(capabilitiesKt).toContain('const val AEC_PATH_NONE = "none"');
  });
});

describe('no AEC ⇒ half duplex (sparring R1-Q3)', () => {
  it('fullDuplexSafe needs an attached AEC or an allowlisted model, and the allowlist is empty in N6', () => {
    expect(capabilitiesKt).toMatch(/fullDuplexSafe = effects\.aec \|\| modelKey\.lowercase\(\) in allowlist/);
    expect(capabilitiesKt).toMatch(/FULL_DUPLEX_MODEL_ALLOWLIST: Set<String> = emptySet\(\)/);
  });

  it('varispeed is the default rate mode (resample is the one-constant fallback)', () => {
    expect(rateKt).toMatch(/PLAYBACK_RATE_MODE: PlaybackRateMode = PlaybackRateMode\.VARISPEED/);
  });
});

describe('rules 41 / 42a — Android sources', () => {
  const files = walk(join(MODULE_DIR, 'android'));
  const forbidden: Array<[string, RegExp]> = [
    ['Android text-to-speech', /android\.speech\.tts|\bTextToSpeech\b/],
    ['expo-speech', /expo-speech/],
    ['a voice id', /voice_id|voiceId/],
  ];

  it('has sources to scan', () => {
    expect(files.some((f) => f.endsWith('VoiceEngine.kt'))).toBe(true);
  });

  it('ships no audio clip', () => {
    expect(files.filter((f) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(f))).toEqual([]);
  });

  it.each(forbidden)('contains no %s', (_label, re) => {
    expect(files.filter((f) => re.test(read(f))).map((f) => relative(MODULE_DIR, f))).toEqual([]);
  });
});
