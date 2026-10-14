/**
 * VTID-05180 — the echo-bench test tone and verdict for the native ORB bench
 * (plan Change 11; the native equivalent of ORB Voice Bench tab 2, F13).
 *
 * The tone is the bench's speech-band signal, synthesised as 24 kHz PCM so it is
 * played through `VitanaVoice.enqueue` exactly like server audio (same player,
 * same rate mode, same echo-cancellation reference):
 *   partials 180 Hz (sawtooth) / 340 / 700 / 1250 Hz (sine), gains 0.5 / (i + 1),
 *   a 3.1 Hz amplitude wobble of depth 0.45, master gain 0.28
 *   (orb-voice-bench.js `startTone`).
 * The bench first measures the room for 1.2 s, then plays for 8 s. Echo mode
 * passes only with ZERO gate openings during playback; speech mode passes when
 * barge-in confirms. Thresholds are never lowered (backend.md §2e-bench).
 *
 * No network and no session: the bench screen (apps/mobile/app/dev/orb-bench.tsx)
 * wires this to the duplex gate and the native module.
 */

export const BENCH_TONE = {
  SAMPLE_RATE: 24000,
  MASTER_GAIN: 0.28,
  WOBBLE_HZ: 3.1,
  WOBBLE_DEPTH: 0.45,
  PARTIALS_HZ: [180, 340, 700, 1250],
  NOISE_FLOOR_MS: 1200,
  PLAYBACK_MS: 8000,
  CHUNK_MS: 100,
} as const;

/**
 * Band-limited sawtooth (Fourier series up to Nyquist), normalised to a peak of 1
 * like Web Audio's, as a one-period wavetable read with linear interpolation.
 */
function sawtoothTable(frequency: number, sampleRate: number): (t: number) => number {
  const harmonics = Math.max(1, Math.floor((sampleRate / 2 - 1) / frequency));
  const size = 4096;
  const table = new Float64Array(size + 1);
  let peak = 0;
  for (let i = 0; i < size; i++) {
    const phase = (2 * Math.PI * i) / size;
    let s = 0;
    for (let k = 1; k <= harmonics; k++) s += ((k % 2 === 1 ? 1 : -1) * Math.sin(k * phase)) / k;
    table[i] = s;
    peak = Math.max(peak, Math.abs(s));
  }
  for (let i = 0; i < size; i++) table[i] /= peak;
  table[size] = table[0];
  return (t: number) => {
    const pos = (t * frequency - Math.floor(t * frequency)) * size;
    const i = Math.floor(pos);
    return table[i] + (table[i + 1] - table[i]) * (pos - i);
  };
}

/** The bench tone as float samples in [-1, 1]. Deterministic. */
export function synthBenchTone(durationMs: number, sampleRate: number = BENCH_TONE.SAMPLE_RATE): Float32Array {
  const count = Math.round((durationMs / 1000) * sampleRate);
  const out = new Float32Array(count);
  const saw = sawtoothTable(BENCH_TONE.PARTIALS_HZ[0], sampleRate);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    let s = 0.5 * saw(t);
    for (let p = 1; p < BENCH_TONE.PARTIALS_HZ.length; p++) {
      s += (0.5 / (p + 1)) * Math.sin(2 * Math.PI * BENCH_TONE.PARTIALS_HZ[p] * t);
    }
    const wobble = 1 + BENCH_TONE.WOBBLE_DEPTH * Math.sin(2 * Math.PI * BENCH_TONE.WOBBLE_HZ * t);
    out[i] = BENCH_TONE.MASTER_GAIN * wobble * s;
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

/** Float → Int16 LE base64, the widget's `_encodeFrame` conversion (s < 0 ? s·0x8000 : s·0x7FFF). */
export function encodePcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, Number.isNaN(s) ? 0 : Math.trunc(s < 0 ? s * 0x8000 : s * 0x7fff), true);
  }
  return bytesToBase64(bytes);
}

/** The bench playback as base64 chunks for `VitanaVoice.enqueue(b64, 24000)`. */
export function benchToneChunks(durationMs: number = BENCH_TONE.PLAYBACK_MS, chunkMs: number = BENCH_TONE.CHUNK_MS): string[] {
  const tone = synthBenchTone(durationMs);
  const perChunk = Math.round((chunkMs / 1000) * BENCH_TONE.SAMPLE_RATE);
  const chunks: string[] = [];
  for (let start = 0; start < tone.length; start += perChunk) {
    chunks.push(encodePcm16Base64(tone.subarray(start, Math.min(tone.length, start + perChunk))));
  }
  return chunks;
}

export type BenchMode = 'echo' | 'speech';

export type BenchRun = {
  mode: BenchMode;
  /** Gate openings (closed→open transitions) while the tone played. */
  openingsDuringPlayback: number;
  /** Confirmed barge-ins while the tone played. */
  bargeCount: number;
  /** Peak RMS while the tone played. */
  peakDuringPlayback: number;
  /** Peak RMS during the 1.2 s room measurement. */
  noiseFloorPeak: number;
  /** DUPLEX_GATE thresholds (passed in; the gate lives in apps/mobile/src/orb). */
  openRms: number;
  closeRms: number;
};

export type BenchVerdict = {
  pass: boolean;
  /** The room was already louder than closeRms: the echo result is pessimistic. */
  noisyRoom: boolean;
  /** openRms − peak during playback (echo mode). */
  headroom: number;
};

/** Same pass rules as orb-voice-bench.js `finish()`. */
export function judgeBench(run: BenchRun): BenchVerdict {
  const pass = run.mode === 'echo' ? run.openingsDuringPlayback === 0 : run.bargeCount > 0;
  return {
    pass,
    noisyRoom: run.noiseFloorPeak > run.closeRms,
    headroom: run.openRms - run.peakDuringPlayback,
  };
}
