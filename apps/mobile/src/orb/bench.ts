/**
 * VTID-05182 — the native echo bench's measurement (plan Change 11, deferred
 * by N6b to N6d): the native equivalent of ORB Voice Bench tab 2
 * (`orb-voice-bench.js`, plan F13). Pure; the screen
 * (app/dev/orb-bench.tsx) feeds it native frames and playback state.
 *
 *   1. noise floor: 1.2 s of room sound, peak RMS recorded;
 *   2. playback: the bench tone (bench-tone.ts, N6b) plays through
 *      `VitanaVoice.enqueue` — the same player, rate mode and echo
 *      reference as gateway audio — while every captured frame runs through
 *      the SAME `evaluateDuplexGateFrame` as a live session (duplex-gate.ts);
 *   3. verdict (`judgeBench`, N6b): echo mode passes only with ZERO gate
 *      openings; speech mode passes when a barge-in confirms.
 *
 * In speech mode a confirmed barge-in stops native playback right away, as a
 * session would, and the time from the confirming frame's arrival to the
 * native stop returning is recorded (device checklist: barge latency).
 * Thresholds are never lowered (backend.md §2e-bench). No network, no session.
 */
import { judgeBench, type BenchMode, type BenchRun, type BenchVerdict } from '../../modules/vitana-voice/src/bench-tone';
import { DUPLEX_GATE, evaluateDuplexGateFrame, initialDuplexGateState, type DuplexGateState, type VoiceFrame } from './duplex-gate';

export type BenchPhase = 'idle' | 'noise' | 'playing' | 'done';

export interface BenchResult extends BenchRun {
  verdict: BenchVerdict;
  framesDuringPlayback: number;
  /** Confirming frame arrival → native stopPlayback() returned, ms (speech mode). */
  stopLatencyMs: number | null;
  playbackRate: number;
}

export class EchoBench {
  phase: BenchPhase = 'idle';
  private gate: DuplexGateState = initialDuplexGateState();
  private playbackStartedAt = 0;
  private bargeSent = false;
  private openings = 0;
  private barges = 0;
  private peak = 0;
  private noisePeak = 0;
  private frames = 0;
  private stopLatencyMs: number | null = null;

  constructor(
    private readonly mode: BenchMode,
    private readonly playbackRate: number,
    private readonly stopPlayback: () => void,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  startNoiseFloor(): void {
    this.phase = 'noise';
  }

  startPlayback(): void {
    this.phase = 'playing';
  }

  onPlaybackState(s: { playing: boolean; startedAt: number }): void {
    if (s.playing && s.startedAt > 0) this.playbackStartedAt = s.startedAt;
  }

  onFrame(f: VoiceFrame): void {
    if (this.phase === 'noise') {
      this.noisePeak = Math.max(this.noisePeak, f.rms);
      return;
    }
    if (this.phase !== 'playing' || this.playbackStartedAt === 0) return;
    const arrived = this.clock();
    this.frames++;
    this.peak = Math.max(this.peak, f.rms);
    const d = evaluateDuplexGateFrame({
      rms: f.rms,
      nowMs: f.ts,
      playbackStartedAtMs: this.playbackStartedAt,
      bargeAlreadySent: this.bargeSent,
      state: this.gate,
    });
    if (!this.gate.open && d.next.open) this.openings++;
    this.gate = d.next;
    if (d.triggerBarge) {
      this.bargeSent = true;
      this.barges++;
      if (this.mode === 'speech') {
        this.stopPlayback();
        this.stopLatencyMs = this.clock() - arrived;
      }
    }
  }

  finish(): BenchResult {
    this.phase = 'done';
    const run: BenchRun = {
      mode: this.mode,
      openingsDuringPlayback: this.openings,
      bargeCount: this.barges,
      peakDuringPlayback: this.peak,
      noiseFloorPeak: this.noisePeak,
      openRms: DUPLEX_GATE.openRms,
      closeRms: DUPLEX_GATE.closeRms,
    };
    return {
      ...run,
      verdict: judgeBench(run),
      framesDuringPlayback: this.frames,
      stopLatencyMs: this.stopLatencyMs,
      playbackRate: this.playbackRate,
    };
  }
}

/** The bench's three playback rates: plain, the default 1.05× and German 1.1× (device checklist 1). */
export const BENCH_RATES = [1, 1.05, 1.1] as const;
