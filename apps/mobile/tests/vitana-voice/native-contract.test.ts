/**
 * VTID-05180 — static checks of the iOS sources that run on Linux CI (the XCTest
 * suite itself needs a macOS runner, STATUS row 8b):
 *   - the Swift module exposes exactly the JS interface (name, events, functions);
 *   - the iOS 17 voice-processing call only exists behind `#available(iOS 17, *)`;
 *   - the 16.x path is not promoted and varispeed is the default rate mode;
 *   - rules 41 / 42a: the module never speaks on its own and never picks a voice.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { NATIVE_FUNCTIONS, NATIVE_MODULE_NAME, VOICE_EVENTS } from '../../modules/vitana-voice';

const MODULE_DIR = join(__dirname, '../../modules/vitana-voice');
const IOS_DIR = join(MODULE_DIR, 'ios');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const read = (file: string) => readFileSync(file, 'utf8');
const swiftSources = walk(IOS_DIR).filter((f) => f.endsWith('.swift') && !f.includes('/Tests/'));
const moduleSwift = read(join(IOS_DIR, 'VitanaVoiceModule.swift'));

describe('Swift ↔ JS contract', () => {
  it('registers the module under the JS name', () => {
    expect(moduleSwift).toContain(`Name("${NATIVE_MODULE_NAME}")`);
  });

  it('declares exactly the interface events', () => {
    const events = /Events\(([^)]*)\)/.exec(moduleSwift)?.[1].match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1));
    expect(events).toEqual([...VOICE_EVENTS]);
  });

  it('declares exactly the interface functions, async where the interface returns a Promise', () => {
    const found: Record<string, string> = {};
    for (const m of moduleSwift.matchAll(/\b(AsyncFunction|Function)\("([^"]+)"\)/g)) {
      found[m[2]] = m[1] === 'AsyncFunction' ? 'async' : 'sync';
    }
    expect(found).toEqual({ ...NATIVE_FUNCTIONS });
  });

  it('sends every event it declares', () => {
    for (const e of VOICE_EVENTS) expect(moduleSwift).toContain(`sendEvent("${e}"`);
  });

  it('is autolinked for iOS', () => {
    const config = JSON.parse(read(join(MODULE_DIR, 'expo-module.config.json')));
    expect(config.platforms).toContain('apple');
    expect(config.apple.modules).toEqual(['VitanaVoiceModule']);
  });
});

describe('AEC path guard (sparring R1-F3)', () => {
  it('calls setVoiceProcessingEnabled only inside an `if #available(iOS 17, *)` block', () => {
    let calls = 0;
    for (const file of swiftSources) {
      const lines = read(file).split('\n');
      lines.forEach((line, i) => {
        if (!line.includes('setVoiceProcessingEnabled(') || line.trim().startsWith('//')) return;
        calls++;
        const guard = lines.slice(Math.max(0, i - 3), i).join('\n');
        expect({ file: relative(MODULE_DIR, file), line: i + 1, guarded: /if #available\(iOS 17, \*\)/.test(guard) }).toEqual({
          file: relative(MODULE_DIR, file),
          line: i + 1,
          guarded: true,
        });
      });
    }
    expect(calls).toBe(1);
  });

  it('keeps the iOS 16.x path unpromoted and varispeed as the default rate mode', () => {
    expect(read(join(IOS_DIR, 'Core/AecPath.swift'))).toMatch(/public let IOS16_FULL_DUPLEX_VERIFIED = false/);
    expect(read(join(IOS_DIR, 'Core/VoiceCapabilities.swift'))).toMatch(/public let PLAYBACK_RATE_MODE: PlaybackRateMode = \.varispeed/);
  });

  it('configures the session as the plan says and never enables background audio', () => {
    const engine = read(join(IOS_DIR, 'VoiceEngine.swift'));
    expect(engine).toContain('setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])');
    expect(engine).toContain('setPreferredIOBufferDuration(0.02)');
    expect(engine).toContain('.notifyOthersOnDeactivation');
    expect(walk(MODULE_DIR).filter((f) => /UIBackgroundModes\s*[:=\]]/.test(read(f)))).toEqual([]);
  });
});

describe('rules 41 / 42a: no speech of its own, no voice choice', () => {
  // Built from parts so this test file does not itself contain the tokens.
  const forbidden = [
    ['AVSpeech', 'Synthesizer'],
    ['android.speech', '.tts'],
    ['expo', '-speech'],
    ['voice', '_id'],
    ['voice', 'Id'],
  ].map((p) => p.join(''));

  const files = walk(MODULE_DIR);

  it.each(forbidden)('no source mentions %s', (token) => {
    expect(files.filter((f) => read(f).includes(token)).map((f) => relative(MODULE_DIR, f))).toEqual([]);
  });

  it('ships no audio assets', () => {
    expect(files.filter((f) => /\.(mp3|wav|m4a|caf|aiff?)$/i.test(f))).toEqual([]);
  });
});
