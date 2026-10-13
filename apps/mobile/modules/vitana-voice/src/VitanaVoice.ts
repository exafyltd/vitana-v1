/**
 * VTID-05180 — VitanaVoice, the native ORB voice module's typed JS API
 * (Native Wave 1b, plan "N6" Interfaces; the same API on iOS and Android).
 *
 * The native side only captures, frames, measures RMS and plays. Every decision
 * about frames (silent or verbatim, barge-in, pre-roll, cooldowns) is made by the
 * TypeScript duplex gate in apps/mobile/src/orb (plan Change 1). The module never
 * speaks a sentence of its own and never chooses a voice (rules 41 / 42a): the
 * server picks the voice and sends PCM.
 *
 * This facade validates what crosses the bridge and fails safe on what comes
 * back: a capability report it cannot read is treated as "not full-duplex safe",
 * so the client falls back to half duplex (plan Change 5).
 */
import { requireNativeModule } from 'expo';

/** One capture frame: 1024 samples, 16 kHz, Int16 LE mono, base64 (2048 bytes, 2732 chars). */
export type VoiceFrame = { b64: string; rms: number; ts: number };
/** `startedAt` is stamped on the false→true edge only. */
export type PlaybackState = { playing: boolean; startedAt: number };
export type RouteOutput = 'speaker' | 'receiver' | 'wired' | 'bluetooth' | 'other';
export type RouteChange = { reason: string; output: RouteOutput };
export type Interruption = { kind: 'began' | 'ended' };
export type AecPath = 'vpio-engine' | 'session-voicechat' | 'android-aec' | 'none';
export type PlaybackRateMode = 'varispeed' | 'resample';
export type VoiceCapabilities = {
  aec: boolean;
  ns: boolean;
  agc: boolean;
  voiceProcessing: boolean;
  aecPath: AecPath;
  /** false ⇒ the client runs half duplex (plan Change 5). */
  fullDuplexSafe: boolean;
  playbackRateMode: PlaybackRateMode;
};
export type StartOptions = { leadFirstOnly: boolean; playbackRate: number };
/**
 * VTID-05182 (N6d, plan Change 16) — microphone permission, the shape Expo's
 * permission modules use. `undetermined` ⇒ show the in-app rationale first;
 * `denied` with `canAskAgain: false` ⇒ only the OS settings can grant it.
 */
export type MicPermissionStatus = 'granted' | 'denied' | 'undetermined';
export type MicPermission = { status: MicPermissionStatus; canAskAgain: boolean };
export type Subscription = { remove(): void };

export interface VitanaVoice {
  /** Audio session + capture + engine. */
  start(opts: StartOptions): Promise<void>;
  stop(): Promise<void>;
  /** Rate from the chunk's mime (16000 | 24000). */
  enqueue(b64: string, sampleRate: number): void;
  /** Synchronous queue clear. */
  stopPlayback(): void;
  setPlaybackRate(rate: number): void;
  getCapabilities(): Promise<VoiceCapabilities>;
  /** Reads the microphone permission without prompting. */
  getMicrophonePermission(): Promise<MicPermission>;
  /** Shows the OS prompt (only after the in-app rationale, N6d). */
  requestMicrophonePermission(): Promise<MicPermission>;
  addListener(e: 'onFrame', cb: (f: VoiceFrame) => void): Subscription;
  addListener(e: 'onPlaybackState', cb: (s: PlaybackState) => void): Subscription;
  addListener(e: 'onInterruption', cb: (i: Interruption) => void): Subscription;
  addListener(e: 'onRouteChange', cb: (r: RouteChange) => void): Subscription;
  addListener(e: 'onBackground', cb: () => void): Subscription;
}

/** Capture and playback formats both native sides implement (plan F1 / F2). */
export const VOICE_FORMAT = {
  IN_RATE_HZ: 16000,
  FRAME_SAMPLES: 1024,
  FRAME_BYTES: 2048,
  FRAME_B64_LENGTH: 2732,
  OUT_RATES_HZ: [16000, 24000],
} as const;

export const PLAYBACK_RATE_LIMITS = { MIN: 0.5, MAX: 2 } as const;

/** The native module's name and surface; tests/vitana-voice/native-contract.test.ts checks the Swift side. */
export const NATIVE_MODULE_NAME = 'VitanaVoice';
export const VOICE_EVENTS = ['onFrame', 'onPlaybackState', 'onInterruption', 'onRouteChange', 'onBackground'] as const;
export type VoiceEvent = (typeof VOICE_EVENTS)[number];
export const NATIVE_FUNCTIONS = {
  start: 'async',
  stop: 'async',
  enqueue: 'sync',
  stopPlayback: 'sync',
  setPlaybackRate: 'sync',
  getCapabilities: 'async',
  getMicrophonePermission: 'async',
  requestMicrophonePermission: 'async',
} as const;

const AEC_PATHS: readonly AecPath[] = ['vpio-engine', 'session-voicechat', 'android-aec', 'none'];
const RATE_MODES: readonly PlaybackRateMode[] = ['varispeed', 'resample'];

/** What the client assumes when a capability report cannot be read: half duplex. */
export const SAFE_CAPABILITIES: VoiceCapabilities = Object.freeze({
  aec: false,
  ns: false,
  agc: false,
  voiceProcessing: false,
  aecPath: 'none',
  fullDuplexSafe: false,
  playbackRateMode: 'varispeed',
});

/** The raw native object (an Expo EventEmitter-backed module). */
export type NativeVitanaVoiceModule = {
  start(opts: StartOptions): Promise<void>;
  stop(): Promise<void>;
  enqueue(b64: string, sampleRate: number): void;
  stopPlayback(): void;
  setPlaybackRate(rate: number): void;
  getCapabilities(): Promise<unknown>;
  getMicrophonePermission(): Promise<unknown>;
  requestMicrophonePermission(): Promise<unknown>;
  addListener(event: string, cb: (payload: never) => void): Subscription;
};

export function isSupportedOutputRate(rate: number): boolean {
  return (VOICE_FORMAT.OUT_RATES_HZ as readonly number[]).includes(rate);
}

export function assertPlaybackRate(rate: number): void {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < PLAYBACK_RATE_LIMITS.MIN || rate > PLAYBACK_RATE_LIMITS.MAX) {
    throw new RangeError(`VitanaVoice: playbackRate must be a number in [${PLAYBACK_RATE_LIMITS.MIN}, ${PLAYBACK_RATE_LIMITS.MAX}], got ${String(rate)}`);
  }
}

/**
 * Reads a native capability report. Anything missing or of the wrong type
 * returns SAFE_CAPABILITIES: an unreadable report must never enable full duplex.
 */
export function normaliseCapabilities(raw: unknown): VoiceCapabilities {
  if (!raw || typeof raw !== 'object') return SAFE_CAPABILITIES;
  const r = raw as Record<string, unknown>;
  const flags = ['aec', 'ns', 'agc', 'voiceProcessing', 'fullDuplexSafe'] as const;
  if (flags.some((k) => typeof r[k] !== 'boolean')) return SAFE_CAPABILITIES;
  if (!AEC_PATHS.includes(r.aecPath as AecPath)) return SAFE_CAPABILITIES;
  if (!RATE_MODES.includes(r.playbackRateMode as PlaybackRateMode)) return SAFE_CAPABILITIES;
  const aecPath = r.aecPath as AecPath;
  return {
    aec: r.aec as boolean,
    ns: r.ns as boolean,
    agc: r.agc as boolean,
    voiceProcessing: r.voiceProcessing as boolean,
    aecPath,
    // No echo canceller we can name ⇒ never full duplex, whatever the flag says.
    fullDuplexSafe: (r.fullDuplexSafe as boolean) && aecPath !== 'none' && (r.aec as boolean),
    playbackRateMode: r.playbackRateMode as PlaybackRateMode,
  };
}

/** What the client assumes when a permission answer cannot be read: not granted, ask again. */
export const UNKNOWN_MIC_PERMISSION: MicPermission = Object.freeze({ status: 'undetermined', canAskAgain: true });

const MIC_STATUSES: readonly MicPermissionStatus[] = ['granted', 'denied', 'undetermined'];

/**
 * Reads a native permission answer ({ status, canAskAgain, granted } on both
 * platforms). Only an explicit `granted` counts as granted; anything
 * unreadable is `undetermined`, so no session ever starts without the OS
 * saying yes.
 */
export function normaliseMicPermission(raw: unknown): MicPermission {
  if (!raw || typeof raw !== 'object') return UNKNOWN_MIC_PERMISSION;
  const r = raw as Record<string, unknown>;
  if (!MIC_STATUSES.includes(r.status as MicPermissionStatus)) return UNKNOWN_MIC_PERMISSION;
  const status = r.status as MicPermissionStatus;
  if (status === 'granted' && r.granted === false) return UNKNOWN_MIC_PERMISSION;
  return { status, canAskAgain: status === 'granted' ? true : r.canAskAgain !== false };
}

/** Wraps a native module (or a test double) in the validated VitanaVoice API. */
export function createVitanaVoice(native: NativeVitanaVoiceModule): VitanaVoice {
  const voice = {
    start(opts: StartOptions): Promise<void> {
      if (!opts || typeof opts.leadFirstOnly !== 'boolean') {
        return Promise.reject(new TypeError('VitanaVoice: start() needs { leadFirstOnly: boolean, playbackRate: number }'));
      }
      try {
        assertPlaybackRate(opts.playbackRate);
      } catch (err) {
        return Promise.reject(err);
      }
      return native.start({ leadFirstOnly: opts.leadFirstOnly, playbackRate: opts.playbackRate });
    },
    stop(): Promise<void> {
      return native.stop();
    },
    enqueue(b64: string, sampleRate: number): void {
      if (typeof b64 !== 'string' || b64.length === 0) {
        throw new TypeError('VitanaVoice: enqueue() needs a non-empty base64 string');
      }
      if (!isSupportedOutputRate(sampleRate)) {
        throw new RangeError(`VitanaVoice: enqueue() plays 16000 or 24000 Hz chunks, got ${String(sampleRate)}`);
      }
      native.enqueue(b64, sampleRate);
    },
    stopPlayback(): void {
      native.stopPlayback();
    },
    setPlaybackRate(rate: number): void {
      assertPlaybackRate(rate);
      native.setPlaybackRate(rate);
    },
    async getCapabilities(): Promise<VoiceCapabilities> {
      try {
        return normaliseCapabilities(await native.getCapabilities());
      } catch {
        return SAFE_CAPABILITIES;
      }
    },
    async getMicrophonePermission(): Promise<MicPermission> {
      try {
        return normaliseMicPermission(await native.getMicrophonePermission());
      } catch {
        return UNKNOWN_MIC_PERMISSION;
      }
    },
    async requestMicrophonePermission(): Promise<MicPermission> {
      try {
        return normaliseMicPermission(await native.requestMicrophonePermission());
      } catch {
        return { status: 'denied', canAskAgain: true };
      }
    },
    addListener(event: VoiceEvent, cb: (payload: never) => void): Subscription {
      if (!(VOICE_EVENTS as readonly string[]).includes(event)) {
        throw new TypeError(`VitanaVoice: unknown event ${String(event)}`);
      }
      return native.addListener(event, cb);
    },
  };
  return voice as VitanaVoice;
}

let cached: VitanaVoice | null = null;

/**
 * The app's VitanaVoice. Resolved on first use, so importing this file in jest
 * or on a platform without the native module does not throw until it is used.
 */
export function getVitanaVoice(): VitanaVoice {
  if (!cached) cached = createVitanaVoice(requireNativeModule<NativeVitanaVoiceModule>(NATIVE_MODULE_NAME));
  return cached;
}

/** Test seam: forget the resolved module. */
export function resetVitanaVoiceForTests(): void {
  cached = null;
}
