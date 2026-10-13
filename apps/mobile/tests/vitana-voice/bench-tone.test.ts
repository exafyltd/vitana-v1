/** VTID-05180 — the native echo bench's test tone (orb-voice-bench.js) and pass rules. */
import {
  BENCH_TONE,
  benchToneChunks,
  bytesToBase64,
  encodePcm16Base64,
  judgeBench,
  synthBenchTone,
} from '../../modules/vitana-voice';

/** Goertzel power of one frequency. */
function power(samples: Float32Array, freq: number, rate: number): number {
  const w = (2 * Math.PI * freq) / rate;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (const x of samples) {
    const s0 = x + c * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}

describe('bench tone', () => {
  const tone = synthBenchTone(1000);

  it('is 24 kHz, deterministic and within [-1, 1]', () => {
    expect(BENCH_TONE.SAMPLE_RATE).toBe(24000);
    expect(tone.length).toBe(24000);
    expect(synthBenchTone(1000)).toEqual(tone);
    let peak = 0;
    for (const x of tone) peak = Math.max(peak, Math.abs(x));
    expect(peak).toBeLessThan(1);
    expect(peak).toBeGreaterThan(0.2);
  });

  it('carries the speech-band partials and nothing at an unrelated frequency', () => {
    const noise = power(tone, 5000, 24000);
    for (const f of BENCH_TONE.PARTIALS_HZ) {
      expect(power(tone, f, 24000)).toBeGreaterThan(noise * 1000);
    }
  });

  it('chunks the 8 s playback into 100 ms base64 PCM chunks for enqueue(b64, 24000)', () => {
    const chunks = benchToneChunks();
    expect(chunks).toHaveLength(80);
    for (const c of chunks) expect(Buffer.from(c, 'base64')).toHaveLength(4800);
  });

  it('encodes Int16 LE exactly like the widget', () => {
    const b64 = encodePcm16Base64(new Float32Array([1.5, -1.5, 0.5, -0.5, 0]));
    expect([...new Int16Array(new Uint8Array(Buffer.from(b64, 'base64')).buffer)]).toEqual([32767, -32768, 16383, -16384, 0]);
  });

  it('base64 matches the platform encoder for every tail length', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 2048]) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
      expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });
});

describe('bench verdict (orb-voice-bench.js finish())', () => {
  const base = { bargeCount: 0, peakDuringPlayback: 0.03, noiseFloorPeak: 0.01, openRms: 0.05, closeRms: 0.025 };

  it('echo mode passes only with zero gate openings', () => {
    expect(judgeBench({ ...base, mode: 'echo', openingsDuringPlayback: 0 }).pass).toBe(true);
    expect(judgeBench({ ...base, mode: 'echo', openingsDuringPlayback: 1 }).pass).toBe(false);
    expect(judgeBench({ ...base, mode: 'echo', openingsDuringPlayback: 0 }).headroom).toBeCloseTo(0.02);
  });

  it('speech mode passes when barge-in confirms', () => {
    expect(judgeBench({ ...base, mode: 'speech', openingsDuringPlayback: 3, bargeCount: 0 }).pass).toBe(false);
    expect(judgeBench({ ...base, mode: 'speech', openingsDuringPlayback: 3, bargeCount: 1 }).pass).toBe(true);
  });

  it('flags a room already louder than closeRms', () => {
    expect(judgeBench({ ...base, mode: 'echo', openingsDuringPlayback: 0, noiseFloorPeak: 0.03 }).noisyRoom).toBe(true);
  });
});
