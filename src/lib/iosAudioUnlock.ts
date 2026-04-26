/**
 * iOS audio playback unlock.
 *
 * iOS Safari and WKWebView require a user gesture to start audio
 * playback the first time. Once a silent audio is played during a
 * gesture, subsequent `<audio>.play()` calls and AudioContext-based
 * playback in the same document are allowed without a fresh gesture.
 *
 * Call this SYNCHRONOUSLY inside a click/tap handler — before any
 * `await` — to bank an unlock that the post-OAuth proactive greeting
 * (which fires ~5s after sign-in completes, well outside the gesture
 * window) can rely on.
 *
 * Idempotent and cheap. The silent audio is volume:0 and < 1ms.
 */

let unlocked = false;

// Tiny silent MP3 (44 bytes payload, well-formed header) inlined as a
// data URL so we don't need a network request during the unlock call.
const SILENT_MP3_DATA_URL =
  "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAABAAACvgAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJALADIAAAAAAAAACvkmS+yMAAAAAAAAAAAAAAAAAAAAA";

/**
 * Unlock iOS audio playback. Call inside a user-gesture handler.
 * Returns immediately; the actual silent play runs async but the
 * gesture is captured at call time.
 */
export function unlockIOSAudioPlayback(): void {
  if (unlocked) return;
  if (typeof window === "undefined") return;

  // Web Audio API unlock — relevant for AudioContext-driven playback
  // (the ORB live-audio pipeline).
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => { /* noop */ });
      }
    }
  } catch {
    /* noop */
  }

  // HTMLAudioElement unlock — relevant for the TTS greeting
  // (`new Audio('data:audio/wav;base64,...').play()`).
  try {
    const a = new Audio(SILENT_MP3_DATA_URL);
    a.volume = 0;
    const playPromise = a.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => { unlocked = true; }).catch(() => { /* gesture rejected — try again next click */ });
    } else {
      unlocked = true;
    }
  } catch {
    /* noop */
  }
}
