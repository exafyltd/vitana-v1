/**
 * ORB instant audio cue — perceived-latency mask for ORB activation.
 *
 * Context / history:
 *   The frontend used to play a *spoken* line ("I'm here, I'm listening.",
 *   `ready-<lang>.mp3`) the instant the user tapped the orb, to mask the
 *   4–5 s the backend spends connecting to Gemini/Vertex Live. VTID-02938
 *   silenced it because a *spoken* frontend line competed with the
 *   backend's continuation contract (B0d wake-brief) — two different voices
 *   choosing the first words. But silencing it left the user staring at the
 *   orb in dead air for 5–7 s while the upstream connects, which reads as a
 *   hang on mobile.
 *
 *   The backend's own design already expects an instant client cue: the SSE
 *   `ready` event is emitted immediately on connect specifically so "the
 *   client can play the activation chime before Live API connects"
 *   (gateway orb-live.ts). This file restores that cue.
 *
 * Why a non-verbal chime (not the old MP3):
 *   A short tone acknowledges the tap WITHOUT speaking, so it never competes
 *   with — or drifts from — the backend-owned spoken greeting/wake-brief.
 *   That sidesteps the exact conflict VTID-02938 removed while still killing
 *   the perceived "nothing happened" gap. The backend remains the single
 *   owner of the first *spoken* words.
 *
 * Provider-agnostic by construction:
 *   Both `useOrbVoiceClient.connect()` (Vertex / SSE) and
 *   `useLiveKitVoice.connect()` (LiveKit / WebRTC) call `playInstantGreeting`
 *   synchronously inside the tap gesture, before either provider's connect
 *   round-trip. The cue therefore bridges the cold-start gap for whichever
 *   pipeline is active.
 *
 * iOS note:
 *   The chime is scheduled on the SHARED unlocked AudioContext
 *   (`getOrCreateUnlockedAudioContext()`), the same instance the live PCM
 *   pipeline uses. It must be invoked synchronously in the gesture so iOS
 *   Safari / WKWebView lets it sound on the first tap.
 */

import { getOrCreateUnlockedAudioContext } from "./iosAudioUnlock";

/**
 * No-op retained for backward compatibility with existing callers.
 *
 * The instant cue is now a synthesized chime — there is no audio asset to
 * pre-fetch, so preloading does nothing. Kept so call sites in
 * `useOrbVoiceClient.ts` / `useLiveKitVoice.ts` continue to compile.
 */
export async function preloadInstantGreeting(_lang: string): Promise<void> {
  return;
}

/** Track scheduled cue nodes so a real backend audio chunk can cut them short. */
let activeCueNodes: AudioScheduledSourceNode[] = [];

/**
 * Play a short, soft, non-verbal acknowledgment chime the instant the orb is
 * tapped. Must be called synchronously inside the user-gesture call stack
 * (before any `await`) so iOS lets it sound and so it lands while the
 * upstream voice session is still connecting.
 *
 * `_lang` is accepted for signature compatibility but unused — a tone has no
 * language, which is part of the point (no spoken words from the frontend).
 */
export function playInstantGreeting(_lang: string): void {
  try {
    const ctx = getOrCreateUnlockedAudioContext();
    if (!ctx) return;

    // A gentle two-note rise (perfect-fifth-ish), quiet, with soft envelopes
    // so it reads as a warm "I'm waking up" cue rather than a notification beep.
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    // Soft master envelope: quick fade-in, gentle fade-out over ~420ms.
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    const notes: Array<{ freq: number; at: number; dur: number }> = [
      { freq: 587.33, at: 0.0, dur: 0.22 }, // D5
      { freq: 880.0, at: 0.12, dur: 0.28 }, // A5
    ];

    activeCueNodes = [];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      g.gain.value = 0.0001;
      g.gain.setValueAtTime(0.0001, now + note.at);
      g.gain.exponentialRampToValueAtTime(1, now + note.at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
      osc.connect(g);
      g.connect(master);
      osc.start(now + note.at);
      osc.stop(now + note.at + note.dur + 0.02);
      activeCueNodes.push(osc);
    }

    // Self-clean once the chime has finished so we don't hold references.
    const lastEnd = now + 0.5;
    const clearAt = Math.max(0, (lastEnd - now) * 1000);
    setTimeout(() => {
      activeCueNodes = [];
    }, clearAt + 50);
  } catch {
    // Audio is best-effort; never let a cue failure break session start.
  }
}

/**
 * Cut the cue short if real backend audio arrives before it finishes.
 *
 * The chime is brief (~0.4 s) so this is rarely needed, but the live client
 * calls it on the first received audio chunk so the cue never overlaps the
 * backend's spoken greeting on a fast connect.
 */
export function stopInstantGreeting(): void {
  try {
    for (const node of activeCueNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
  } finally {
    activeCueNodes = [];
  }
}
