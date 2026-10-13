/**
 * VTID-05179 — the native duplex gate (N6a, Change 5).
 *
 * Part 1 ports vitana-platform `test/orb/full-duplex-session-gate.test.ts`
 * (VTID-03706) 1:1 against the mobile copy. NATIVE-CI `orb-parity` adds the
 * differential run against the platform function itself.
 * Part 2 covers the legacy half-duplex path, the pipeline and the
 * capability override.
 */
import {
  AudioPipeline,
  DUPLEX_GATE,
  LEGACY_GATE,
  SILENT_FRAME_B64,
  evaluateDuplexGateFrame,
  evaluateLegacyFrame,
  initialDuplexGateState,
  initialLegacyGateState,
  resolveDuplexMode,
  zeroBytesBase64,
  type DuplexGateState,
} from '../../src/orb/duplex-gate';

const ECHO_RMS = 0.03;
const SPEECH_RMS = 0.2;
const QUIET_SPEECH_RMS = 0.055;
const FRAME_MS = 64;

function runFrames(rmsSequence: number[], opts: { playbackStartedAtMs?: number; startMs?: number } = {}) {
  const startMs = opts.startMs ?? 100_000;
  const playbackStartedAtMs = opts.playbackStartedAtMs ?? startMs - 10_000;
  let state: DuplexGateState = initialDuplexGateState();
  let bargeAlreadySent = false;
  const decisions = rmsSequence.map((rms, i) => {
    const d = evaluateDuplexGateFrame({ rms, nowMs: startMs + i * FRAME_MS, playbackStartedAtMs, bargeAlreadySent, state });
    state = d.next;
    if (d.triggerBarge) bargeAlreadySent = true;
    return d;
  });
  return { decisions, state };
}

describe('VTID-03706 port — speech gets through', () => {
  it('passes real speech on the very first frame', () => {
    expect(runFrames([SPEECH_RMS]).decisions[0].passthrough).toBe(true);
  });

  it('passes quiet speech that the legacy 0.06 threshold discarded', () => {
    expect(QUIET_SPEECH_RMS).toBeLessThan(0.06);
    expect(runFrames([QUIET_SPEECH_RMS]).decisions[0].passthrough).toBe(true);
  });

  it('keeps the gate open through a mid-word dip (hysteresis)', () => {
    const dip = (DUPLEX_GATE.openRms + DUPLEX_GATE.closeRms) / 2;
    expect(runFrames([SPEECH_RMS, dip, dip, SPEECH_RMS]).decisions.map((d) => d.passthrough)).toEqual([true, true, true, true]);
  });

  it('holds open across a short gap, then closes after the hangover', () => {
    const gapFrames = Math.ceil(DUPLEX_GATE.hangoverMs / FRAME_MS) + 2;
    const { decisions } = runFrames([SPEECH_RMS, ...new Array(gapFrames).fill(0)]);
    expect(decisions[1].passthrough).toBe(true);
    expect(decisions[decisions.length - 1].passthrough).toBe(false);
  });
});

describe('VTID-03706 port — echo does not get through', () => {
  it('blocks sustained AEC residue across 0.01-0.04', () => {
    for (const rms of [0.01, 0.02, 0.03, 0.04]) {
      const { decisions } = runFrames(new Array(20).fill(rms));
      expect(decisions.some((d) => d.passthrough)).toBe(false);
      expect(decisions.some((d) => d.triggerBarge)).toBe(false);
    }
  });

  it('never barges on echo alone', () => {
    expect(runFrames(new Array(200).fill(ECHO_RMS)).decisions.some((d) => d.triggerBarge)).toBe(false);
  });

  it('holds shut during the AEC warm-up', () => {
    const startMs = 50_000;
    const { decisions } = runFrames([SPEECH_RMS, SPEECH_RMS, SPEECH_RMS], { startMs, playbackStartedAtMs: startMs });
    expect(decisions.every((d) => !d.passthrough && !d.triggerBarge)).toBe(true);
  });

  it('does not let warm-up frames accumulate toward barge confirmation', () => {
    const startMs = 50_000;
    let state = initialDuplexGateState();
    for (let i = 0; i < Math.ceil(DUPLEX_GATE.aecWarmupMs / FRAME_MS); i++) {
      state = evaluateDuplexGateFrame({ rms: SPEECH_RMS, nowMs: startMs + i * FRAME_MS, playbackStartedAtMs: startMs, bargeAlreadySent: false, state }).next;
    }
    expect(state.openFrames).toBe(0);
  });

  it('opens normally once the warm-up has elapsed', () => {
    const startMs = 50_000;
    const d = evaluateDuplexGateFrame({
      rms: SPEECH_RMS,
      nowMs: startMs + DUPLEX_GATE.aecWarmupMs + 1,
      playbackStartedAtMs: startMs,
      bargeAlreadySent: false,
      state: initialDuplexGateState(),
    });
    expect(d.passthrough).toBe(true);
  });
});

describe('VTID-03706 port — barge confirmation', () => {
  it('confirms within the sub-200 ms budget', () => {
    const first = runFrames(new Array(6).fill(SPEECH_RMS)).decisions.findIndex((d) => d.triggerBarge);
    expect(first).toBeGreaterThanOrEqual(0);
    expect((first + 1) * FRAME_MS).toBeLessThan(200);
  });

  it('rejects a single-frame transient', () => {
    expect(runFrames([SPEECH_RMS, 0, 0, 0, 0, 0, 0, 0, 0, 0]).decisions.some((d) => d.triggerBarge)).toBe(false);
  });

  it('forwards audio from frame 1 although barge confirms later', () => {
    const { decisions } = runFrames([SPEECH_RMS, SPEECH_RMS]);
    expect(decisions[0]).toMatchObject({ passthrough: true, triggerBarge: false });
    expect(decisions[1].triggerBarge).toBe(true);
  });

  it('does not re-fire once sent for this burst', () => {
    expect(runFrames(new Array(20).fill(SPEECH_RMS)).decisions.filter((d) => d.triggerBarge)).toHaveLength(1);
  });
});

describe('VTID-03706 port — constants stay coherent', () => {
  it('matches the platform values', () => {
    expect(DUPLEX_GATE).toEqual({ openRms: 0.05, closeRms: 0.025, hangoverMs: 400, aecWarmupMs: 250, bargeConfirmFrames: 2 });
  });
  it('open above the residue band, below speech; close below open; budgets hold', () => {
    expect(DUPLEX_GATE.openRms).toBeGreaterThan(0.04);
    expect(DUPLEX_GATE.openRms).toBeLessThan(0.1);
    expect(DUPLEX_GATE.closeRms).toBeLessThan(DUPLEX_GATE.openRms);
    expect(DUPLEX_GATE.bargeConfirmFrames * FRAME_MS).toBeLessThan(200);
    expect(DUPLEX_GATE.aecWarmupMs).toBeLessThanOrEqual(500);
  });
});

// ── Part 2 ───────────────────────────────────────────────────────────────

describe('silent frame', () => {
  it('is the cached all-zero 2048-byte frame, 2732 base64 characters', () => {
    expect(SILENT_FRAME_B64).toHaveLength(2732);
    const bytes = Buffer.from(SILENT_FRAME_B64, 'base64');
    expect(bytes).toHaveLength(2048);
    expect(bytes.every((b) => b === 0)).toBe(true);
  });
  it('zeroBytesBase64 matches Buffer for every remainder', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 2047, 2048]) expect(zeroBytesBase64(n)).toBe(Buffer.alloc(n).toString('base64'));
  });
});

function legacyRun(frames: Array<{ rms: number; b64: string }>) {
  let state = initialLegacyGateState();
  return frames.map((f, i) => {
    const d = evaluateLegacyFrame({ ...f, nowMs: 1000 + i * 64, playing: true, fullDuplex: false, turnCompleteAt: 0, lastAudioEndAt: 0, state });
    state = d.next;
    return d;
  });
}

describe('legacy half-duplex path (F12)', () => {
  it('buffers frames below 0.06 during playback and sends nothing', () => {
    const ds = legacyRun(new Array(20).fill(0).map((_, i) => ({ rms: 0.059, b64: `f${i}` })));
    expect(ds.every((d) => d.action === 'buffer')).toBe(true);
  });

  it('6 frames above 0.06 confirm; the last 8 frames are flushed in order', () => {
    const frames = [...new Array(4).fill(0).map((_, i) => ({ rms: 0.01, b64: `q${i}` })), ...new Array(6).fill(0).map((_, i) => ({ rms: 0.2, b64: `s${i}` }))];
    const ds = legacyRun(frames);
    const barge = ds.findIndex((d) => d.action === 'barge');
    expect(barge).toBe(9);
    const d = ds[barge];
    expect(d.action === 'barge' && d.flush).toEqual(['q2', 'q3', 's0', 's1', 's2', 's3', 's4', 's5']);
    expect(LEGACY_GATE.preRollMaxFrames).toBe(8);
  });

  it('a dip below the threshold restarts the confirmation', () => {
    const rms = [0.2, 0.2, 0.2, 0.2, 0.2, 0.01, 0.2, 0.2, 0.2, 0.2, 0.2];
    expect(legacyRun(rms.map((r, i) => ({ rms: r, b64: `${i}` }))).some((d) => d.action === 'barge')).toBe(false);
  });

  it('applies the 200 ms cooldowns only when fullDuplex is false', () => {
    const base = { b64: 'x', rms: 0.2, playing: false, lastAudioEndAt: 0, state: initialLegacyGateState() };
    expect(evaluateLegacyFrame({ ...base, nowMs: 1150, fullDuplex: false, turnCompleteAt: 1000 }).action).toBe('drop');
    expect(evaluateLegacyFrame({ ...base, nowMs: 1150, fullDuplex: true, turnCompleteAt: 1000 }).action).toBe('send');
    expect(evaluateLegacyFrame({ ...base, nowMs: 1200, fullDuplex: false, turnCompleteAt: 1000 }).action).toBe('send');
    expect(evaluateLegacyFrame({ ...base, nowMs: 1199, fullDuplex: false, turnCompleteAt: 0, lastAudioEndAt: 1000 }).action).toBe('drop');
    expect(evaluateLegacyFrame({ ...base, nowMs: 1199, fullDuplex: true, turnCompleteAt: 0, lastAudioEndAt: 1000 }).action).toBe('send');
  });
});

function pipelineHarness() {
  const out: string[] = [];
  const p = new AudioPipeline({
    sendAudio: (b64) => out.push(b64 === SILENT_FRAME_B64 ? 'audio:silent' : `audio:${b64}`),
    sendInterrupt: () => out.push('interrupt'),
    stopPlayback: () => out.push('stopPlayback'),
  });
  return { p, out };
}

describe('AudioPipeline', () => {
  it('outside playback every frame passes', () => {
    const { p, out } = pipelineHarness();
    p.setFullDuplex(true);
    for (let i = 0; i < 5; i++) p.onFrame({ b64: `f${i}`, rms: 0.001, ts: 1000 + i * 64 });
    expect(out).toEqual(['audio:f0', 'audio:f1', 'audio:f2', 'audio:f3', 'audio:f4']);
  });

  it('full duplex: every native frame yields exactly one outbound audio during playback, never dropped', () => {
    const { p, out } = pipelineHarness();
    p.setFullDuplex(true);
    p.onPlaybackState({ playing: true, startedAt: 1000 }, 1000);
    const rms = [0.3, 0.3, 0.01, 0.01, 0.03, 0.03, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
    rms.forEach((r, i) => p.onFrame({ b64: `f${i}`, rms: r, ts: 1000 + i * 64 }));
    expect(out.filter((o) => o.startsWith('audio:'))).toHaveLength(rms.length);
    // The first four frames fall inside the 250 ms warm-up: silent.
    expect(out.slice(0, 4)).toEqual(['audio:silent', 'audio:silent', 'audio:silent', 'audio:silent']);
    expect(p.stats.barges).toBe(0);
  });

  it('full duplex barge-in: frame first, then the native stop, then interrupt', () => {
    const { p, out } = pipelineHarness();
    p.setFullDuplex(true);
    p.onPlaybackState({ playing: true, startedAt: 1000 }, 1000);
    p.onFrame({ b64: 'speech1', rms: 0.2, ts: 2000 });
    p.onFrame({ b64: 'speech2', rms: 0.2, ts: 2064 });
    expect(out).toEqual(['audio:speech1', 'audio:speech2', 'stopPlayback', 'interrupt']);
    p.onFrame({ b64: 'after', rms: 0.2, ts: 2128 });
    expect(out[out.length - 1]).toBe('audio:after');
  });

  it('half duplex during playback: nothing below 0.06 is sent; barge = stop, interrupt, ordered pre-roll flush', () => {
    const { p, out } = pipelineHarness();
    p.setFullDuplex(false);
    p.onPlaybackState({ playing: true, startedAt: 1000 }, 1000);
    for (let i = 0; i < 10; i++) p.onFrame({ b64: `e${i}`, rms: 0.05, ts: 2000 + i * 64 });
    expect(out).toEqual([]);
    for (let i = 0; i < 6; i++) p.onFrame({ b64: `s${i}`, rms: 0.2, ts: 3000 + i * 64 });
    expect(out).toEqual(['stopPlayback', 'interrupt', 'audio:e8', 'audio:e9', 'audio:s0', 'audio:s1', 'audio:s2', 'audio:s3', 'audio:s4', 'audio:s5']);
  });

  it('server interrupted clears the native queue', () => {
    const { p, out } = pipelineHarness();
    p.onPlaybackState({ playing: true, startedAt: 1000 }, 1000);
    p.onServerInterrupted();
    expect(out).toEqual(['stopPlayback']);
    expect(p.isPlaying).toBe(false);
  });

  it('half duplex: the post-audio-end cooldown drops frames for 200 ms', () => {
    const { p, out } = pipelineHarness();
    p.onPlaybackState({ playing: true, startedAt: 1000 }, 1000);
    p.onPlaybackState({ playing: false, startedAt: 0 }, 5000);
    p.onFrame({ b64: 'early', rms: 0.2, ts: 5100 });
    p.onFrame({ b64: 'late', rms: 0.2, ts: 5200 });
    expect(out).toEqual(['audio:late']);
  });
});

describe('capability override (Change 5)', () => {
  it('server full duplex + safe device ⇒ full duplex', () => {
    expect(resolveDuplexMode(true, { fullDuplexSafe: true })).toEqual({ fullDuplex: true, mode: 'full_duplex' });
  });
  it('server full duplex + Android without AEC ⇒ half duplex, reason no_aec', () => {
    expect(resolveDuplexMode(true, { fullDuplexSafe: false, aec: false, aecPath: 'none' })).toEqual({ fullDuplex: false, mode: 'half_duplex:no_aec' });
  });
  it('server full duplex + iOS 16.x path unverified ⇒ half duplex, reason ios16_path_unverified', () => {
    expect(resolveDuplexMode(true, { fullDuplexSafe: false, aecPath: 'session-voicechat' })).toEqual({
      fullDuplex: false,
      mode: 'half_duplex:ios16_path_unverified',
    });
  });
  it('the client never enables full duplex itself', () => {
    expect(resolveDuplexMode(false, { fullDuplexSafe: true })).toEqual({ fullDuplex: false, mode: null });
  });
});
