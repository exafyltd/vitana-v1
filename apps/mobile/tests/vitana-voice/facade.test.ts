/** VTID-05180 — the VitanaVoice JS facade: validation in, fail-safe capabilities out. */
import {
  createVitanaVoice,
  getVitanaVoice,
  normaliseCapabilities,
  resetVitanaVoiceForTests,
  SAFE_CAPABILITIES,
  VOICE_FORMAT,
  type NativeVitanaVoiceModule,
} from '../../modules/vitana-voice';

jest.mock('expo', () => ({ requireNativeModule: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireNativeModule } = require('expo') as { requireNativeModule: jest.Mock };

function fakeNative(overrides: Partial<NativeVitanaVoiceModule> = {}) {
  const native = {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    enqueue: jest.fn(),
    stopPlayback: jest.fn(),
    setPlaybackRate: jest.fn(),
    getCapabilities: jest.fn(async () => ({
      aec: true, ns: true, agc: true, voiceProcessing: true,
      aecPath: 'vpio-engine', fullDuplexSafe: true, playbackRateMode: 'varispeed',
    })),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    ...overrides,
  };
  return native;
}

describe('VitanaVoice facade', () => {
  it('passes start options through and rejects a bad playback rate', async () => {
    const native = fakeNative();
    const voice = createVitanaVoice(native);
    await voice.start({ leadFirstOnly: true, playbackRate: 1.1 });
    expect(native.start).toHaveBeenCalledWith({ leadFirstOnly: true, playbackRate: 1.1 });
    await expect(voice.start({ leadFirstOnly: true, playbackRate: Number.NaN })).rejects.toThrow(RangeError);
    await expect(voice.start({ leadFirstOnly: false, playbackRate: 3 })).rejects.toThrow(RangeError);
    await expect(voice.start({ playbackRate: 1.05 } as never)).rejects.toThrow(TypeError);
    expect(native.start).toHaveBeenCalledTimes(1);
  });

  it('plays only 16000 or 24000 Hz chunks (the rate from the mime)', () => {
    const native = fakeNative();
    const voice = createVitanaVoice(native);
    voice.enqueue('AAAA', 24000);
    voice.enqueue('AAAA', 16000);
    expect(native.enqueue).toHaveBeenNthCalledWith(1, 'AAAA', 24000);
    expect(native.enqueue).toHaveBeenNthCalledWith(2, 'AAAA', 16000);
    expect(() => voice.enqueue('AAAA', 44100)).toThrow(RangeError);
    expect(() => voice.enqueue('', 24000)).toThrow(TypeError);
    expect(native.enqueue).toHaveBeenCalledTimes(2);
    expect(VOICE_FORMAT.OUT_RATES_HZ).toEqual([16000, 24000]);
  });

  it('stopPlayback is a direct synchronous call', () => {
    const native = fakeNative();
    createVitanaVoice(native).stopPlayback();
    expect(native.stopPlayback).toHaveBeenCalledTimes(1);
  });

  it('validates setPlaybackRate', () => {
    const native = fakeNative();
    const voice = createVitanaVoice(native);
    voice.setPlaybackRate(1.05);
    expect(native.setPlaybackRate).toHaveBeenCalledWith(1.05);
    expect(() => voice.setPlaybackRate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => voice.setPlaybackRate(0)).toThrow(RangeError);
  });

  it('only subscribes to the five interface events', () => {
    const native = fakeNative();
    const voice = createVitanaVoice(native);
    const cb = jest.fn();
    for (const e of ['onFrame', 'onPlaybackState', 'onInterruption', 'onRouteChange', 'onBackground'] as const) {
      voice.addListener(e as 'onFrame', cb);
    }
    expect(native.addListener).toHaveBeenCalledTimes(5);
    expect(() => voice.addListener('onSpeak' as 'onFrame', cb)).toThrow(TypeError);
  });

  it('reads a valid capability report', async () => {
    const voice = createVitanaVoice(fakeNative());
    await expect(voice.getCapabilities()).resolves.toEqual({
      aec: true, ns: true, agc: true, voiceProcessing: true,
      aecPath: 'vpio-engine', fullDuplexSafe: true, playbackRateMode: 'varispeed',
    });
  });

  it('reports the iOS 16.x path as not full-duplex safe, as the native side sends it', async () => {
    const voice = createVitanaVoice(fakeNative({
      getCapabilities: jest.fn(async () => ({
        aec: true, ns: true, agc: true, voiceProcessing: false,
        aecPath: 'session-voicechat', fullDuplexSafe: false, playbackRateMode: 'varispeed',
      })),
    }));
    expect((await voice.getCapabilities()).fullDuplexSafe).toBe(false);
  });

  it('fails safe (half duplex) on a malformed, contradictory or failing report', async () => {
    expect(normaliseCapabilities(null)).toEqual(SAFE_CAPABILITIES);
    expect(normaliseCapabilities({ fullDuplexSafe: true })).toEqual(SAFE_CAPABILITIES);
    expect(normaliseCapabilities({
      aec: true, ns: true, agc: true, voiceProcessing: true,
      aecPath: 'magic', fullDuplexSafe: true, playbackRateMode: 'varispeed',
    })).toEqual(SAFE_CAPABILITIES);
    expect(normaliseCapabilities({
      aec: false, ns: false, agc: false, voiceProcessing: false,
      aecPath: 'none', fullDuplexSafe: true, playbackRateMode: 'resample',
    }).fullDuplexSafe).toBe(false);
    const failing = createVitanaVoice(fakeNative({ getCapabilities: jest.fn(async () => { throw new Error('boom'); }) }));
    await expect(failing.getCapabilities()).resolves.toEqual(SAFE_CAPABILITIES);
    expect(SAFE_CAPABILITIES.fullDuplexSafe).toBe(false);
  });

  it('resolves the native module lazily, once', () => {
    resetVitanaVoiceForTests();
    requireNativeModule.mockReset();
    requireNativeModule.mockReturnValue(fakeNative());
    expect(requireNativeModule).not.toHaveBeenCalled();
    const a = getVitanaVoice();
    const b = getVitanaVoice();
    expect(a).toBe(b);
    expect(requireNativeModule).toHaveBeenCalledTimes(1);
    expect(requireNativeModule).toHaveBeenCalledWith('VitanaVoice');
    resetVitanaVoiceForTests();
  });
});
