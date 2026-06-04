/**
 * iOS audio playback unlock.
 *
 * iOS Safari and WKWebView require a user gesture to start audio
 * playback the first time. Once a silent audio is played during a
 * gesture, subsequent `<audio>.play()` calls and AudioContext-based
 * playback in the same document are allowed without a fresh gesture.
 *
 * Call these helpers SYNCHRONOUSLY inside a click/tap handler — before
 * any `await` — so the unlock is captured against the still-live
 * gesture. Idempotent across calls; subsequent calls reuse the shared
 * AudioContext.
 *
 * The ORB voice path needs the *same* AudioContext that gets unlocked
 * here to be the one used for PCM playback later — creating a fresh
 * AudioContext after the gesture window closes leaves it suspended on
 * iOS, even if a different context was unlocked. So consumers must
 * pull from `getOrCreateUnlockedAudioContext()` instead of
 * `new AudioContext()`.
 */

let unlocked = false;
let sharedAudioContext: AudioContext | null = null;

// Tiny silent MP3 (44 bytes payload, well-formed header) inlined as a
// data URL so we don't need a network request during the unlock call.
const SILENT_MP3_DATA_URL =
  "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAABAAACvgAuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJALADIAAAAAAAAACvkmS+yMAAAAAAAAAAAAAAAAAAAAA";

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext || null;
}

function playSilentBufferOn(ctx: AudioContext): void {
  // Canonical iOS unlock: play a 1-sample silent buffer while the
  // gesture is still live. Merely creating the context isn't enough.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { /* noop */ });
    }
  } catch {
    /* noop */
  }
}

/**
 * Get (or lazily create + unlock) the shared AudioContext used by the
 * ORB voice pipeline. Must be called synchronously inside a user
 * gesture the *first* time, otherwise the returned context will start
 * suspended and resume() can fail silently on iOS.
 *
 * Subsequent calls return the same context and re-play the silent
 * unlock buffer (cheap, idempotent) so a later gesture can re-unlock
 * if iOS suspended us behind our back (route change, phone call, etc).
 */
export function getOrCreateUnlockedAudioContext(): AudioContext | null {
  const Ctx = getAudioContextCtor();
  if (!Ctx) return null;

  if (!sharedAudioContext || (sharedAudioContext as AudioContext).state === "closed") {
    try {
      sharedAudioContext = new Ctx();
    } catch {
      sharedAudioContext = null;
      return null;
    }
  }

  playSilentBufferOn(sharedAudioContext);
  return sharedAudioContext;
}

/**
 * VTID-03272 — make Web Audio ignore the iOS hardware mute/ring switch.
 *
 * iOS silences ALL Web Audio API output (the PCM TTS playback) when the
 * physical side switch is on silent — so a user whose phone is on silent
 * hears NOTHING, while a phone with the switch off plays fine. Setting the
 * Web Audio session category to "play-and-record" makes playback ignore the
 * mute switch (like a phone/FaceTime call) AND keeps the mic enabled, which a
 * voice assistant needs. Feature-detected (iOS 16.4+ / WebKit); a no-op
 * everywhere else, so it cannot regress Android/desktop or older iOS.
 */
function setVoiceAudioSession(): void {
  try {
    const audioSession = (navigator as unknown as { audioSession?: { type?: string } }).audioSession;
    if (audioSession && typeof audioSession.type === "string") {
      audioSession.type = "play-and-record";
    }
  } catch {
    /* noop — unsupported platform */
  }
}

/**
 * Unlock iOS audio playback. Call inside a user-gesture handler.
 * Returns immediately; the actual silent play runs async but the
 * gesture is captured at call time.
 */
export function unlockIOSAudioPlayback(): void {
  if (typeof window === "undefined") return;

  // VTID-03272 — ignore the iOS mute switch so silent-mode phones still
  // hear Vitana. Set inside the gesture, before any AudioContext work.
  setVoiceAudioSession();

  // Web Audio API unlock — relevant for AudioContext-driven playback
  // (the ORB live-audio pipeline). Reuses the shared context so the
  // ORB client picks up the same unlocked instance.
  getOrCreateUnlockedAudioContext();

  // HTMLAudioElement unlock — relevant for the TTS greeting
  // (`new Audio('data:audio/wav;base64,...').play()`).
  if (unlocked) return;
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
