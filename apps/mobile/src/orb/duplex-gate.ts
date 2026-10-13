/**
 * VTID-05179 — the ORB duplex gate for the native app (N6a, plan Changes 1 and 5).
 *
 * SOURCE OF TRUTH: vitana-platform
 * `services/gateway/src/orb/live/duplex/full-duplex-gate.ts` (`DUPLEX_GATE`,
 * `evaluateDuplexGateFrame`, VTID-03706). The two exports below are a copy
 * with identical semantics. NATIVE-CI `orb-parity`
 * (`scripts/native/orb-parity.mjs`) fetches the platform file from `main`
 * on every pull request, on every push to main and daily, deep-compares the
 * constants and runs both functions over the platform's scripted scenarios
 * plus 20,000 seeded random frames: every decision and every next state must
 * match. Change the platform file and that job tells you to change this one.
 *
 * Layering: the gate runs here, in TypeScript, never in Swift or Kotlin. The
 * native voice modules only capture, frame, compute RMS and play; every
 * decision (silent or verbatim frame, barge-in, legacy pre-roll, cooldowns)
 * is made by `AudioPipeline` below, mirroring the widget's capture handler
 * (`orb-widget.js` `_startAudioCapture`, :4060-4310).
 *
 * Full duplex is decided by the server (`session_started.full_duplex` on WS,
 * `live_api_ready.full_duplex` on SSE). The client can only turn it OFF, for
 * a device that cannot cancel echo (`fullDuplexSafe: false`); it then runs
 * the legacy half-duplex path, which the server handles either way.
 */
import { ORB_AUDIO, ORB_DUPLEX, type OrbDuplexMode } from './protocol';

// ── Copy of the platform gate (keep byte-for-byte equivalent in behaviour) ──

export const DUPLEX_GATE = {
  openRms: 0.05,
  closeRms: 0.025,
  hangoverMs: 400,
  aecWarmupMs: 250,
  bargeConfirmFrames: 2,
} as const;

/** State the client gate carries between capture callbacks. */
export interface DuplexGateState {
  open: boolean;
  lastVoiceMs: number;
  openFrames: number;
}

export interface DuplexGateDecision {
  /** Emit the captured frame verbatim (false ⇒ emit a silent frame). */
  passthrough: boolean;
  /** This frame completed the barge confirmation: stop playback, interrupt. */
  triggerBarge: boolean;
  next: DuplexGateState;
}

export function initialDuplexGateState(): DuplexGateState {
  return { open: false, lastVoiceMs: 0, openFrames: 0 };
}

/** Decide what to do with one captured mic frame while the model is speaking. */
export function evaluateDuplexGateFrame(input: {
  rms: number;
  nowMs: number;
  playbackStartedAtMs: number;
  bargeAlreadySent: boolean;
  state: DuplexGateState;
}): DuplexGateDecision {
  const { rms, nowMs, playbackStartedAtMs, bargeAlreadySent, state } = input;

  if (playbackStartedAtMs > 0 && nowMs - playbackStartedAtMs < DUPLEX_GATE.aecWarmupMs) {
    return {
      passthrough: false,
      triggerBarge: false,
      next: { open: false, lastVoiceMs: state.lastVoiceMs, openFrames: 0 },
    };
  }

  const aboveOpen = rms > DUPLEX_GATE.openRms;
  const aboveClose = rms > DUPLEX_GATE.closeRms;

  let open = state.open;
  let lastVoiceMs = state.lastVoiceMs;

  if (open) {
    if (aboveClose) {
      lastVoiceMs = nowMs;
    } else if (nowMs - lastVoiceMs >= DUPLEX_GATE.hangoverMs) {
      open = false;
    }
  } else if (aboveOpen) {
    open = true;
    lastVoiceMs = nowMs;
  }

  let openFrames: number;
  if (!open) {
    openFrames = 0;
  } else if (aboveClose) {
    openFrames = state.openFrames + 1;
  } else {
    openFrames = state.openFrames;
  }

  const triggerBarge = open && !bargeAlreadySent && openFrames >= DUPLEX_GATE.bargeConfirmFrames;

  return {
    passthrough: open,
    triggerBarge,
    next: { open, lastVoiceMs, openFrames },
  };
}

// ── Legacy half-duplex path (orb-widget.js :4071-4302) ───────────────────

/** Widget literals of the half-duplex path; `orb-parity` checks each one against the widget. */
export const LEGACY_GATE = {
  /** `vadThreshold = 0.06` (:4071). */
  vadThreshold: 0.06,
  /** `vadConfirm = 6` (:4075). */
  vadConfirm: 6,
  /** `PRE_ROLL_MAX_FRAMES = 8` (:4115). */
  preRollMaxFrames: 8,
  /** Post-`turn_complete` cooldown (:4295). */
  turnCompleteCooldownMs: 200,
  /** Post-audio-end cooldown (:4302). */
  audioEndCooldownMs: 200,
} as const;

export interface LegacyGateState {
  vadFrames: number;
  bargeSent: boolean;
  /** Encoded frames captured during playback, oldest first (≤ `preRollMaxFrames`). */
  preRoll: string[];
}

export function initialLegacyGateState(): LegacyGateState {
  return { vadFrames: 0, bargeSent: false, preRoll: [] };
}

export type LegacyDecision =
  /** During playback, below confirmation: buffered, nothing sent. */
  | { action: 'buffer'; next: LegacyGateState }
  /** Confirmed barge-in: stop playback, send `interrupt`, then send `flush` in order. */
  | { action: 'barge'; flush: string[]; next: LegacyGateState }
  /** Outside playback, inside a cooldown window: dropped. */
  | { action: 'drop'; next: LegacyGateState }
  /** Outside playback: sent verbatim. */
  | { action: 'send'; next: LegacyGateState };

/**
 * One capture callback on the half-duplex path. Pure: the frame `b64` is
 * pushed into the pre-roll ring during playback; 6 consecutive frames above
 * 0.06 confirm a barge-in. The 200 ms cooldowns apply only when `fullDuplex`
 * is false (`!_s.fullDuplex && …`, :4295 / :4302).
 *
 * Order on barge-in mirrors the widget: interrupt first, then the pre-roll
 * flush (`_flushPreRollOrdered(preRollFrames, _interruptAck)`), because a
 * half-duplex server drops mic audio while the model is speaking until the
 * interrupt has been processed.
 */
export function evaluateLegacyFrame(input: {
  b64: string;
  rms: number;
  nowMs: number;
  playing: boolean;
  fullDuplex: boolean;
  turnCompleteAt: number;
  lastAudioEndAt: number;
  state: LegacyGateState;
}): LegacyDecision {
  const { b64, rms, nowMs, playing, fullDuplex, turnCompleteAt, lastAudioEndAt, state } = input;
  if (playing) {
    const preRoll = [...state.preRoll, b64];
    if (preRoll.length > LEGACY_GATE.preRollMaxFrames) preRoll.shift();
    if (rms > LEGACY_GATE.vadThreshold) {
      const vadFrames = state.vadFrames + 1;
      if (vadFrames >= LEGACY_GATE.vadConfirm && !state.bargeSent) {
        return { action: 'barge', flush: preRoll, next: { vadFrames, bargeSent: true, preRoll: [] } };
      }
      return { action: 'buffer', next: { vadFrames, bargeSent: state.bargeSent, preRoll } };
    }
    return { action: 'buffer', next: { vadFrames: 0, bargeSent: state.bargeSent, preRoll } };
  }
  const next = initialLegacyGateState();
  if (!fullDuplex && turnCompleteAt > 0 && nowMs - turnCompleteAt < LEGACY_GATE.turnCompleteCooldownMs) {
    return { action: 'drop', next };
  }
  if (!fullDuplex && lastAudioEndAt > 0 && nowMs - lastAudioEndAt < LEGACY_GATE.audioEndCooldownMs) {
    return { action: 'drop', next };
  }
  return { action: 'send', next };
}

// ── Silent frame ─────────────────────────────────────────────────────────

/** Base64 of `bytes` zero bytes, without allocating (Int16 zeros === digital silence). */
export function zeroBytesBase64(bytes: number): string {
  const full = Math.floor(bytes / 3);
  const rem = bytes % 3;
  return 'AAAA'.repeat(full) + (rem === 1 ? 'AA==' : rem === 2 ? 'AAA=' : '');
}

/** `_silentFrame(1024)` (:4336-4343): 2048 zero bytes, 2732 base64 characters. Cached. */
export const SILENT_FRAME_B64 = zeroBytesBase64(ORB_AUDIO.FRAME_SAMPLES * 2);

// ── Effective mode ───────────────────────────────────────────────────────

export interface DeviceDuplexCapability {
  /** False when the device cannot cancel echo (Android without AEC, iOS 16.x path unverified). */
  fullDuplexSafe: boolean;
  aec?: boolean;
  aecPath?: 'vpio-engine' | 'session-voicechat' | 'android-aec' | 'none';
}

/**
 * `effectiveFullDuplex = server.full_duplex && device.fullDuplexSafe`, plus
 * the `app_state.orb_duplex` value reported once per session:
 *   - `full_duplex` when both agree;
 *   - `half_duplex:<reason>` whenever the device cannot run full duplex
 *     (the client would override a full-duplex server);
 *   - `null` when the server itself chose half duplex on a capable device:
 *     nothing is overridden, so nothing is reported.
 * The client never enables full duplex on its own (backend.md §2e-duplex).
 */
export function resolveDuplexMode(serverFullDuplex: boolean, device: DeviceDuplexCapability): {
  fullDuplex: boolean;
  mode: OrbDuplexMode | null;
} {
  if (!device.fullDuplexSafe) {
    const ios16 = device.aecPath === 'session-voicechat';
    return { fullDuplex: false, mode: ios16 ? ORB_DUPLEX.HALF_IOS16_UNVERIFIED : ORB_DUPLEX.HALF_NO_AEC };
  }
  if (serverFullDuplex) return { fullDuplex: true, mode: ORB_DUPLEX.FULL };
  return { fullDuplex: false, mode: null };
}

// ── Audio pipeline ───────────────────────────────────────────────────────

/** A native capture frame: 1024 samples, 16 kHz, Int16 LE mono, base64; RMS of the float signal. */
export interface VoiceFrame {
  b64: string;
  rms: number;
  ts: number;
}

/** What the pipeline needs from the session and the native module. */
export interface PipelineSink {
  sendAudio(b64: string): void;
  sendInterrupt(): void;
  /** Native `stopPlayback()`: synchronous queue clear. */
  stopPlayback(): void;
}

export interface PipelineStats {
  framesIn: number;
  framesSent: number;
  silentSent: number;
  barges: number;
}

/**
 * Binds native frame events and playback state to the gate. One instance per
 * session. `onFrame` is called for every native capture callback.
 */
export class AudioPipeline {
  private fullDuplex = false;
  private playing = false;
  private playbackStartedAt = 0;
  private turnCompleteAt = 0;
  private lastAudioEndAt = 0;
  private gate: DuplexGateState = initialDuplexGateState();
  private duplexBargeSent = false;
  private legacy: LegacyGateState = initialLegacyGateState();
  private muted = false;
  readonly stats: PipelineStats = { framesIn: 0, framesSent: 0, silentSent: 0, barges: 0 };

  constructor(private readonly sink: PipelineSink) {}

  /** Sets the effective mode (`resolveDuplexMode(...).fullDuplex`). */
  setFullDuplex(effective: boolean): void {
    this.fullDuplex = effective;
  }

  get isFullDuplex(): boolean {
    return this.fullDuplex;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Native `onPlaybackState`. `startedAt` is stamped by the module on the false→true edge only. */
  onPlaybackState(state: { playing: boolean; startedAt: number }, nowMs: number): void {
    if (state.playing) {
      this.playbackStartedAt = state.startedAt;
      this.playing = true;
      return;
    }
    if (this.playing) this.lastAudioEndAt = nowMs;
    this.playing = false;
    this.playbackStartedAt = 0;
  }

  /** Server `turn_complete`. */
  onTurnComplete(nowMs: number): void {
    this.turnCompleteAt = nowMs;
  }

  /** Server `interrupted` (:3550-3561): clear the native queue, stop playing. */
  onServerInterrupted(): void {
    this.sink.stopPlayback();
    this.playing = false;
    this.playbackStartedAt = 0;
  }

  onFrame(frame: VoiceFrame): void {
    if (this.muted) return;
    this.stats.framesIn++;
    if (this.playing && this.fullDuplex) {
      this.fullDuplexFrame(frame);
      return;
    }
    const d = evaluateLegacyFrame({
      b64: frame.b64,
      rms: frame.rms,
      nowMs: frame.ts,
      playing: this.playing,
      fullDuplex: this.fullDuplex,
      turnCompleteAt: this.turnCompleteAt,
      lastAudioEndAt: this.lastAudioEndAt,
      state: this.legacy,
    });
    this.legacy = d.next;
    if (!this.playing) {
      // Between bursts the duplex gate starts closed again (:4280-4285).
      this.gate = initialDuplexGateState();
      this.duplexBargeSent = false;
    }
    switch (d.action) {
      case 'send':
        this.send(frame.b64);
        break;
      case 'barge':
        this.stats.barges++;
        this.sink.stopPlayback();
        this.playing = false;
        this.sink.sendInterrupt();
        for (const b64 of d.flush) this.send(b64);
        break;
      default:
        break;
    }
  }

  private fullDuplexFrame(frame: VoiceFrame): void {
    const d = evaluateDuplexGateFrame({
      rms: frame.rms,
      nowMs: frame.ts,
      playbackStartedAtMs: this.playbackStartedAt,
      bargeAlreadySent: this.duplexBargeSent,
      state: this.gate,
    });
    this.gate = d.next;
    // Every callback emits a frame: verbatim when open, digital silence otherwise. Never `return` without one.
    if (d.passthrough) this.send(frame.b64);
    else this.sendSilent();
    if (d.triggerBarge) {
      // Frame first, then the local stop, then the interrupt (:4203-4227).
      this.duplexBargeSent = true;
      this.stats.barges++;
      this.sink.stopPlayback();
      this.playing = false;
      this.playbackStartedAt = 0;
      this.sink.sendInterrupt();
    }
  }

  private send(b64: string): void {
    this.stats.framesSent++;
    this.sink.sendAudio(b64);
  }

  private sendSilent(): void {
    this.stats.framesSent++;
    this.stats.silentSent++;
    this.sink.sendAudio(SILENT_FRAME_B64);
  }
}
