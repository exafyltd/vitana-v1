/**
 * VTID-05179 — the JS contract of the native voice module (plan "Interfaces").
 *
 * N6b (iOS, Swift) and N6c (Android, Kotlin) implement it in the Expo local
 * module `apps/mobile/modules/vitana-voice`. The session and the audio
 * pipeline depend only on this interface, so N6a is tested with a fake
 * engine and no device.
 *
 * The module captures, frames (1024 samples, 16 kHz, Int16 LE mono), computes
 * RMS and plays PCM. It makes no gate decision and never speaks on its own:
 * every sound it plays is gateway audio passed to `enqueue`.
 */
import type { VoiceFrame } from './duplex-gate';

export type { VoiceFrame };

export interface PlaybackState {
  playing: boolean;
  /** Stamped on the false→true edge only (orb-widget.js:2256-2263). */
  startedAt: number;
}

export interface RouteChange {
  reason: string;
  output: 'speaker' | 'receiver' | 'wired' | 'bluetooth' | 'other';
}

export interface VoiceCapabilities {
  aec: boolean;
  ns: boolean;
  agc: boolean;
  voiceProcessing: boolean;
  aecPath: 'vpio-engine' | 'session-voicechat' | 'android-aec' | 'none';
  /** False ⇒ the client runs half duplex whatever the server says (Change 5). */
  fullDuplexSafe: boolean;
  playbackRateMode: 'varispeed' | 'resample';
}

export interface Subscription {
  remove(): void;
}

export interface VoiceEngine {
  start(opts: { leadFirstOnly: boolean; playbackRate: number }): Promise<void>;
  stop(): Promise<void>;
  /** PCM16 LE mono base64 at `sampleRate` (16000 | 24000, from the mime). */
  enqueue(b64: string, sampleRate: number): void;
  /** Synchronous queue clear. */
  stopPlayback(): void;
  setPlaybackRate(rate: number): void;
  getCapabilities(): Promise<VoiceCapabilities>;
  addListener(e: 'onFrame', cb: (f: VoiceFrame) => void): Subscription;
  addListener(e: 'onPlaybackState', cb: (s: PlaybackState) => void): Subscription;
  addListener(e: 'onInterruption', cb: (i: { kind: 'began' | 'ended' }) => void): Subscription;
  addListener(e: 'onRouteChange', cb: (r: RouteChange) => void): Subscription;
  addListener(e: 'onBackground', cb: () => void): Subscription;
}
