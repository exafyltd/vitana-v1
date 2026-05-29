/**
 * VTID-02938 (B0d follow-up) — instantGreeting is now SILENT by design.
 *
 * Why this file is here:
 *   The frontend used to play "I'm here, I'm listening." (or a localised
 *   pre-recorded MP3) the instant the user tapped the orb button, to mask
 *   the 4–5 s the backend spent connecting to Gemini Live. This was a
 *   passive request-response cue that competed with the backend's
 *   continuation contract (B0d) for the user's attention.
 *
 *   The backend's wake-brief now owns the first spoken words after orb
 *   activation. When the wake-brief is empty AND no other continuation
 *   provider has a candidate, the orb stays silent on first activation
 *   — silence is a valid first state per the plan, and is preferable to
 *   any frontend-generated copy that drifts from what the backend would
 *   have chosen.
 *
 * Why the functions still exist (not removed):
 *   The exports are kept as no-ops so existing call sites in
 *   `useOrbVoiceClient.ts` and `useLiveKitVoice.ts` continue to compile
 *   and run without a follow-up PR. A future cleanup can delete the
 *   call sites and this file together once the silencing has been live
 *   long enough to verify no regressions.
 *
 * Reference: vitana-platform B0d (Continuation Contract + Voice Wake
 * Brief) and the "no new spoken text from the frontend after B0d ships"
 * guardrail in the assistant-intelligence refactor plan.
 */

/**
 * No-op. Kept for backward compatibility with existing callers.
 *
 * Previously preloaded a `ready-<lang>.mp3` voice-line into the shared
 * AudioContext so playback could begin on the synchronous user-gesture
 * path. The backend wake-brief now owns the first spoken words, so
 * there's nothing to preload.
 */
export async function preloadInstantGreeting(_lang: string): Promise<void> {
  return;
}

/**
 * No-op. Kept for backward compatibility with existing callers.
 *
 * Previously played a short voice line ("I'm here, I'm listening.") to
 * mask backend cold-start latency. The backend's continuation contract
 * (B0d) now produces a `wake_brief` continuation that becomes the first
 * spoken words; the orb stays silent until the backend speaks.
 *
 * The shared AudioContext unlock is still performed by the live tap
 * handler in `useOrbVoiceClient.connect()` via `getOrCreateUnlockedAudioContext()`
 * — that side-effect must NOT move here. This function intentionally
 * does no audio work.
 */
export function playInstantGreeting(_lang: string): void {
  return;
}
