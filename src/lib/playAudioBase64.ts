/**
 * Play a base64-encoded audio payload via Web Audio API instead of
 * HTMLAudioElement.
 *
 * Why this exists: on iPhone, HTMLAudioElement (`<audio>` tags created
 * with `new Audio(...)`) honor the physical Silent switch — when the
 * switch is on, the audio plays at zero volume and the user hears
 * nothing. AudioContext-based playback ignores the Silent switch
 * because it routes through the media playback session, which is what
 * we want for greetings, TTS responses, and any other in-app voice.
 *
 * Web Audio API also gets us a couple of side benefits:
 *   - On iOS, the AudioContext can be unlocked once during a user
 *     gesture and stays unlocked for the document lifetime.
 *   - Volume is per-source via GainNode, decoupled from the system
 *     ringer volume slider that affects HTMLAudioElement.
 *
 * Returns a Promise that resolves when playback ends, or rejects on
 * decode/playback failure. The caller is expected to call this from a
 * context where audio is allowed (post-user-gesture or post-unlock).
 */

let sharedContext: AudioContext | null = null;

function getSharedContext(): AudioContext | null {
  try {
    if (!sharedContext || (sharedContext as AudioContext & { state: AudioContextState }).state === "closed") {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      sharedContext = new Ctx();
    }
    return sharedContext;
  } catch {
    return null;
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface PlayAudioOptions {
  /** Linear gain 0–1; defaults to 1 (full volume relative to media playback bus). */
  volume?: number;
  /** Fired when playback actually starts. */
  onStart?: () => void;
  /** Fired when playback finishes naturally. */
  onEnd?: () => void;
}

export async function playAudioBase64(base64: string, options: PlayAudioOptions = {}): Promise<void> {
  const ctx = getSharedContext();
  if (!ctx) throw new Error("Web Audio API not available");

  // Resume on every play in case the context drifted into suspended state
  // (iOS does this aggressively when the page goes to background).
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore — decode/play below will throw a clearer error */
    }
  }

  const arrayBuffer = base64ToArrayBuffer(base64);
  // decodeAudioData mutates the buffer reference in some Safari versions, so
  // copy first to be safe across re-plays.
  const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
    ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
  });

  const source = ctx.createBufferSource();
  source.buffer = decoded;

  const gain = ctx.createGain();
  gain.gain.value = options.volume ?? 1;
  source.connect(gain).connect(ctx.destination);

  return new Promise<void>((resolve) => {
    source.onended = () => {
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
      options.onEnd?.();
      resolve();
    };
    source.start(0);
    options.onStart?.();
  });
}
