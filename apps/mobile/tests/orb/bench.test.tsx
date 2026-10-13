/**
 * VTID-05182 — the native echo bench (plan Change 11, deferred by N6b to N6d).
 * The measurement runs the session's own duplex gate; the screen runs with a
 * fake voice module (no device, no network, no session).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DUPLEX_GATE } from '../../src/orb/duplex-gate';
import { BENCH_RATES, EchoBench } from '../../src/orb/bench';
import { BENCH_TONE } from '../../modules/vitana-voice/src/bench-tone';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { UIProvider } from '../../src/ports/ui';

const mockProfile = { value: 'development' as string | undefined };
jest.mock('expo-constants', () => ({ __esModule: true, default: { get expoConfig() { return { extra: { profile: mockProfile.value }, version: '0.0.0' }; } } }));

type Listener = (p: unknown) => void;
const mockVoice = {
  listeners: new Map<string, Set<Listener>>(),
  calls: [] as string[],
  enqueued: 0,
  async getMicrophonePermission() {
    return { status: 'granted', canAskAgain: true };
  },
  async requestMicrophonePermission() {
    return { status: 'granted', canAskAgain: true };
  },
  async getCapabilities() {
    return { aec: true, ns: true, agc: true, voiceProcessing: true, aecPath: 'vpio-engine', fullDuplexSafe: true, playbackRateMode: 'varispeed' };
  },
  async start(opts: unknown) {
    mockVoice.calls.push(`start:${JSON.stringify(opts)}`);
  },
  async stop() {
    mockVoice.calls.push('stop');
  },
  enqueue() {
    mockVoice.enqueued++;
  },
  stopPlayback() {
    mockVoice.calls.push('stopPlayback');
  },
  addListener(e: string, cb: Listener) {
    if (!mockVoice.listeners.has(e)) mockVoice.listeners.set(e, new Set());
    mockVoice.listeners.get(e)!.add(cb);
    return { remove: () => mockVoice.listeners.get(e)!.delete(cb) };
  },
  emit(e: string, p: unknown) {
    for (const cb of mockVoice.listeners.get(e) ?? []) cb(p);
  },
};
jest.mock('../../modules/vitana-voice/src/VitanaVoice', () => ({ getVitanaVoice: () => mockVoice }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OrbBench = (require('../../app/dev/orb-bench') as { default: () => JSX.Element }).default;

describe('EchoBench (same gate as a live session)', () => {
  const T0 = 10_000;

  function playEcho(rmsList: number[], mode: 'echo' | 'speech' = 'echo') {
    const stop = jest.fn();
    let now = 0;
    const b = new EchoBench(mode, 1.05, stop, () => now);
    b.startNoiseFloor();
    b.onFrame({ b64: '', rms: 0.004, ts: T0 - 500 });
    b.onFrame({ b64: '', rms: 0.009, ts: T0 - 436 });
    b.startPlayback();
    b.onPlaybackState({ playing: true, startedAt: T0 });
    rmsList.forEach((rms, i) => {
      now = i;
      b.onFrame({ b64: '', rms, ts: T0 + 64 * (i + 1) });
    });
    return { result: b.finish(), stop };
  }

  it('echo below the gate everywhere ⇒ zero openings ⇒ PASS', () => {
    const { result } = playEcho(Array(100).fill(DUPLEX_GATE.openRms - 0.001));
    expect(result).toMatchObject({ openingsDuringPlayback: 0, bargeCount: 0, noiseFloorPeak: 0.009, framesDuringPlayback: 100, playbackRate: 1.05 });
    expect(result.verdict.pass).toBe(true);
  });

  it('one echo frame above openRms after the warm-up ⇒ an opening ⇒ FAIL (thresholds never lowered)', () => {
    const rms = Array(100).fill(0.01);
    rms[20] = DUPLEX_GATE.openRms + 0.001;
    const { result } = playEcho(rms);
    expect(result.openingsDuringPlayback).toBe(1);
    expect(result.verdict.pass).toBe(false);
  });

  it('loud echo inside the 250 ms AEC warm-up is not counted (same as the session gate)', () => {
    const rms = Array(20).fill(0.01);
    rms[0] = 0.5;
    rms[1] = 0.5;
    expect(playEcho(rms).result.openingsDuringPlayback).toBe(0);
  });

  it('speech mode: a confirmed barge-in passes and stops native playback at once', () => {
    const rms = Array(20).fill(0.01);
    rms[10] = 0.2;
    rms[11] = 0.2;
    const { result, stop } = playEcho(rms, 'speech');
    expect(result.bargeCount).toBe(1);
    expect(result.verdict.pass).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.stopLatencyMs).toBe(0);
  });

  it('frames before playback starts are ignored; the three bench rates are 1.0 / 1.05 / 1.1', () => {
    const b = new EchoBench('echo', 1, jest.fn());
    b.startPlayback();
    b.onFrame({ b64: '', rms: 0.9, ts: 1 });
    expect(b.finish().framesDuringPlayback).toBe(0);
    expect(BENCH_RATES).toEqual([1, 1.05, 1.1]);
  });
});

function Screen() {
  return (
    <I18nProvider initialLocale="de">
      <UIProvider colorScheme="light" direction="ltr" t={(k) => k}>
        <OrbBench />
      </UIProvider>
    </I18nProvider>
  );
}

describe('app/dev/orb-bench.tsx', () => {
  beforeEach(() => {
    mockProfile.value = 'development';
    mockVoice.calls = [];
    mockVoice.enqueued = 0;
    mockVoice.listeners.clear();
  });

  it('is only available in development and test-g1 builds', () => {
    mockProfile.value = 'production';
    render(<Screen />);
    expect(screen.getByTestId('orb-bench-unavailable')).toBeTruthy();
    expect(screen.getByText('Den Echo-Test gibt es nur in Entwicklungs- und Test-Versionen der App.')).toBeTruthy();
  });

  it('runs: noise floor, tone through enqueue at 24 kHz, verdict; no network', async () => {
    jest.useFakeTimers();
    try {
      (globalThis as { fetch: unknown }).fetch = () => {
        throw new Error('network is disabled in tests');
      };
      render(<Screen />);
      fireEvent.press(screen.getByTestId('orb-bench-rate-1.1'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('orb-bench-start'));
      });
      expect(mockVoice.calls[0]).toBe('start:{"leadFirstOnly":false,"playbackRate":1.1}');
      expect(screen.getByTestId('orb-bench-phase').props.children).toBe('Raumgeräusch wird gemessen …');
      await act(async () => {
        jest.advanceTimersByTime(BENCH_TONE.NOISE_FLOOR_MS);
      });
      expect(mockVoice.enqueued).toBe(BENCH_TONE.PLAYBACK_MS / BENCH_TONE.CHUNK_MS);
      act(() => {
        mockVoice.emit('onPlaybackState', { playing: true, startedAt: 1000 });
        for (let i = 1; i <= 50; i++) mockVoice.emit('onFrame', { b64: '', rms: 0.01, ts: 1000 + 64 * i });
      });
      await act(async () => {
        jest.advanceTimersByTime(BENCH_TONE.PLAYBACK_MS / 1.1 + 1000);
      });
      expect(screen.getByTestId('orb-bench-result')).toBeTruthy();
      expect(screen.getByText('Bestanden')).toBeTruthy();
      expect(screen.getByText('Öffnungen des Sprach-Gates: 0')).toBeTruthy();
      expect(mockVoice.calls).toContain('stop');
      expect(mockVoice.listeners.get('onFrame')?.size ?? 0).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
