/**
 * Instant ORB greeting — plays a short voice line the moment the user taps the
 * orb button, so the UX feels immediate while the backend spends 4–5s building
 * context + connecting to Gemini Live + synthesizing the real greeting.
 *
 * Playback priority:
 *   1. Pre-recorded MP3 at /sounds/orb/ready-<lang>.mp3 (decoded + cached)
 *   2. Web Speech API (speechSynthesis) as fallback when the file is missing
 *   3. Silent no-op if neither works
 *
 * The caller MUST invoke playInstantGreeting() synchronously inside the user
 * gesture (click/tap handler) — before any await — otherwise iOS Safari will
 * refuse to play audio. preloadInstantGreeting() can run any time to warm the
 * buffer cache for a faster first playback.
 *
 * VTID-02680: this module shares the same AudioContext as the ORB voice
 * pipeline (`getOrCreateUnlockedAudioContext()` in `iosAudioUnlock.ts`). Owning
 * a separate context here was the iOS-only failure mode where the instant
 * greeting played into a context that was never unlocked inside a user
 * gesture, so it was silent on Safari/WKWebView while the Gemini chunks that
 * came later played fine through the unlocked shared context.
 */
import { getOrCreateUnlockedAudioContext } from './iosAudioUnlock';

type InstantLang = 'en' | 'de';

const TEXT_FALLBACK: Record<InstantLang, string> = {
  en: "I'm here, I'm listening.",
  de: 'Ich bin da, ich höre zu.',
};

const FILE_URL: Record<InstantLang, string> = {
  en: '/sounds/orb/ready-en.mp3',
  de: '/sounds/orb/ready-de.mp3',
};

const bufferCache = new Map<InstantLang, AudioBuffer>();
const preloadInFlight = new Map<InstantLang, Promise<void>>();

function normalizeLang(lang: string | undefined | null): InstantLang {
  const base = (lang || 'en').split('-')[0].toLowerCase();
  return base === 'de' ? 'de' : 'en';
}

export async function preloadInstantGreeting(lang: string): Promise<void> {
  const l = normalizeLang(lang);
  if (bufferCache.has(l)) return;
  const existing = preloadInFlight.get(l);
  if (existing) return existing;

  const job = (async () => {
    try {
      const res = await fetch(FILE_URL[l], { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      const ctx = getOrCreateUnlockedAudioContext();
      if (!ctx) return;
      const buf = await ctx.decodeAudioData(arr.slice(0));
      bufferCache.set(l, buf);
      console.log(`[instantGreeting] Preloaded ${l}, duration=${buf.duration.toFixed(2)}s`);
    } catch (e) {
      console.warn(`[instantGreeting] Preload skipped for ${l} (falling back to speechSynthesis at play time):`, (e as Error).message);
    } finally {
      preloadInFlight.delete(l);
    }
  })();

  preloadInFlight.set(l, job);
  return job;
}

export function playInstantGreeting(lang: string): void {
  const l = normalizeLang(lang);
  // Pull the SHARED context that was unlocked in the live tap gesture by
  // useOrbVoiceClient.connect() before this call. Owning our own context here
  // was the iOS-only regression source — that context never saw a gesture.
  const ctx = getOrCreateUnlockedAudioContext();
  const cached = bufferCache.get(l);

  if (cached && ctx) {
    try {
      if ((ctx as any).state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const src = ctx.createBufferSource();
      src.buffer = cached;
      src.connect(ctx.destination);
      src.start(0);
      console.log(`[instantGreeting] Played file ${l}, duration=${cached.duration.toFixed(2)}s, ctx=${(ctx as any).state}`);
      return;
    } catch (e) {
      console.warn(`[instantGreeting] File playback failed for ${l}, falling back:`, e);
    }
  }

  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(TEXT_FALLBACK[l]);
      u.lang = l === 'de' ? 'de-DE' : 'en-US';
      u.rate = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      console.log(`[instantGreeting] Played via speechSynthesis ${l}`);
      return;
    }
  } catch (e) {
    console.warn('[instantGreeting] speechSynthesis failed:', e);
  }

  console.log(`[instantGreeting] No playback method available for ${l} — silent`);
}
