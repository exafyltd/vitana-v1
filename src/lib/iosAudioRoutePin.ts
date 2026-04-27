/**
 * iOS WKWebView audio route pin — keep ORB output on the loudspeaker.
 *
 * iOS has two audio session categories: `Playback` (loudspeaker) and
 * `PlayAndRecord` (defaults to the earpiece, the small phone-call speaker).
 * The moment `getUserMedia` opens the mic, WKWebView switches the session
 * to `PlayAndRecord` for the rest of the page lifetime, so every PCM chunk
 * we play after that routes to the earpiece — quiet, hand-cupped audio.
 *
 * There is no JS API to force loudspeaker; Apple keeps that behind native
 * `AVAudioSession`. The documented WebKit workaround is to keep an
 * HTMLAudioElement playing a silent looping clip throughout the session —
 * WebKit treats that as active media playback and pins the route to the
 * loudspeaker even after the mic activates. Battery cost is negligible.
 *
 * Android Chromium has no such routing problem, so this is iOS-only.
 */

const IS_IOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

// 1-second silent WAV (mono, 8kHz, 16-bit) — small enough to inline, long
// enough to loop cleanly without WebKit glitching on sub-frame buffers.
const SILENT_WAV_DATA_URL =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let pinElement: HTMLAudioElement | null = null;
let pinRefCount = 0;

export function pinIOSLoudspeakerRoute(): void {
  if (!IS_IOS) return;
  pinRefCount++;
  if (pinElement) return;

  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    // Legacy WKWebView attribute — harmless on modern Safari.
    el.setAttribute('webkit-playsinline', '');
    el.loop = true;
    el.preload = 'auto';
    el.src = SILENT_WAV_DATA_URL;
    // Must NOT be muted: muted media doesn't hold the audio session active
    // and the route pin no-ops. Volume can be near-zero — WebKit still
    // counts it as active output.
    el.volume = 0.001;
    el.style.position = 'fixed';
    el.style.width = '0';
    el.style.height = '0';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    // play() must be called inside the same gesture stack that called
    // pinIOSLoudspeakerRoute(); ORB connect runs us synchronously after
    // the user tap, so the gesture is still live here.
    const playPromise = el.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch((e) => {
        console.warn('[iosAudioRoutePin] silent loop play() rejected:', e);
      });
    }
    pinElement = el;
  } catch (e) {
    console.warn('[iosAudioRoutePin] failed to install pin:', e);
  }
}

export function releaseIOSLoudspeakerRoute(): void {
  if (!IS_IOS) return;
  pinRefCount = Math.max(0, pinRefCount - 1);
  if (pinRefCount > 0) return;
  if (!pinElement) return;
  try {
    pinElement.pause();
    pinElement.removeAttribute('src');
    pinElement.load();
    pinElement.remove();
  } catch {
    /* noop */
  }
  pinElement = null;
}
