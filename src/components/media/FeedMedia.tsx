/**
 * Instagram-style media frame for community/profile posts.
 *
 * Members upload portrait smartphone selfies. A fixed 16:9 landscape crop
 * chopped off their heads; showing the full image at natural height made tall
 * portraits balloon down the feed. This matches Instagram's middle ground:
 * the frame's aspect ratio follows the upload but is clamped to a portrait
 * floor (4:5) and a landscape ceiling (1.91:1), with object-cover doing a
 * gentle centre-crop only on media taller/wider than those bounds. Faces
 * survive, nothing dominates the screen.
 *
 * Inline controls (Facebook-style, lower-right): a sound toggle for videos and
 * an expand/fullscreen toggle for both photos and videos.
 *
 * Audio is scroll-following and feed-wide: videos always mount muted, the
 * speaker is a single global mute switch, and only the most-visible video
 * carries sound (see the controller below).
 *
 * Fullscreen:
 *  - iOS keeps its native video player (`webkitEnterFullscreen`) — it already
 *    works well there (smooth, and returns to the same scroll spot), so we do
 *    not touch it.
 *  - Everywhere else (Android, desktop) we open an in-app overlay instead of the
 *    OS Fullscreen API. Android's WebView is slow to enter element fullscreen
 *    and snaps the feed back to the top on exit; the overlay opens instantly and
 *    never touches the feed's scroll position, so closing returns the member to
 *    the exact post they were on.
 *
 * Every control stops propagation — the card navigates to the author's profile
 * on click, and the controls must not trigger that.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";

// Instagram's published display bounds.
const PORTRAIT_MIN_RATIO = 4 / 5; // 0.8 — tallest allowed (width / height)
const LANDSCAPE_MAX_RATIO = 1.91; // widest allowed
const DEFAULT_RATIO = PORTRAIT_MIN_RATIO; // before dimensions are known

function clampRatio(width: number, height: number): number {
  if (!width || !height) return DEFAULT_RATIO;
  return Math.min(LANDSCAPE_MAX_RATIO, Math.max(PORTRAIT_MIN_RATIO, width / height));
}

// --- Scroll-following feed audio ------------------------------------------
// One small module-level controller coordinates every mounted video so that at
// most one ever carries sound. `enabled` is the feed-wide mute switch (off until
// the user taps a speaker — that tap is the gesture that unlocks unmuted play).
// While enabled, `activeId` is the most-visible video, recomputed as visibility
// ratios change on scroll. Subscribers are notified synchronously so the active
// video's first `play()` stays inside the originating user gesture.
const VISIBILITY_FLOOR = 0.5; // a clip must be at least half on-screen to claim audio
const SWITCH_MARGIN = 0.1; // hysteresis — a rival must be clearly more visible to steal

const feedAudio = (() => {
  let enabled = false;
  let activeId: string | null = null;
  const visibility = new Map<string, number>();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());

  const recompute = () => {
    let next: string | null = null;
    if (enabled) {
      const current = activeId;
      const currentRatio = current ? visibility.get(current) ?? 0 : 0;
      let best: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of visibility) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = id;
        }
      }
      if (bestRatio < VISIBILITY_FLOOR) {
        next = current && currentRatio > 0 ? current : null;
      } else if (current && currentRatio >= VISIBILITY_FLOOR && bestRatio - currentRatio < SWITCH_MARGIN) {
        next = current; // current clip is still good enough — avoid flicker
      } else {
        next = best;
      }
    }
    if (next !== activeId) {
      activeId = next;
      notify();
    }
  };

  return {
    isEnabled: () => enabled,
    getActiveId: () => activeId,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setVisibility(id: string, ratio: number) {
      visibility.set(id, ratio);
      recompute();
    },
    unregister(id: string) {
      visibility.delete(id);
      recompute();
    },
    toggle() {
      enabled = !enabled;
      recompute();
      notify(); // ensure icon state propagates even when activeId is unchanged
    },
  };
})();

// --- Captured-frame cache ---------------------------------------------------
// A video post with no separate `image_url` thumbnail has nothing to show as
// a poster, so the <video> element is solid black until its own bytes decode.
// React Router fully unmounts/remounts the News route (and every <video> DOM
// node in it) on every navigation, so without this, a clip the member already
// watched a minute ago goes black again on every return visit — reads as "it
// reloaded" even though the underlying post data was served from cache.
//
// The first time a given clip is seen this session, grab a frame from it into
// a small canvas and keep it, keyed by the (stable, per-post) video URL. A
// later mount of the same clip uses that captured frame as its poster —
// instant, no black flash — while the real bytes still load behind it.
// Capped so a long session doesn't grow this unbounded; a fixed pixel size
// (rather than device-pixel-accurate) keeps the cached JPEGs small.
const CAPTURED_FRAME_CACHE_LIMIT = 50;
const CAPTURED_FRAME_MAX_DIM = 320;
const capturedFrames = new Map<string, string>();
const captureAttempted = new Set<string>();

function rememberCapturedFrame(url: string, dataUrl: string) {
  capturedFrames.set(url, dataUrl);
  if (capturedFrames.size > CAPTURED_FRAME_CACHE_LIMIT) {
    const oldest = capturedFrames.keys().next().value;
    if (oldest) capturedFrames.delete(oldest);
  }
}

/**
 * Best-effort, fully decoupled from the real (visible, playing) <video>
 * element — this loads the SAME url a second time into a throwaway, hidden,
 * never-attached video purely to grab a frame off it. Deliberately not done
 * by reading the live element directly: that would require setting
 * `crossOrigin="anonymous"` on the element the member actually watches, and
 * this codebase has no way to verify from here whether the media host (a
 * different origin — Supabase Storage) answers CORS-mode range requests
 * cleanly. Isolating the attempt to a disposable element means a bad answer
 * (or none) only fails this capture silently; it can never affect real
 * playback. Runs once per unique URL per session (`captureAttempted` guards
 * both a spammed retry and a wasted repeat of an already-cached frame).
 */
function ensureFrameCaptured(url: string) {
  if (captureAttempted.has(url) || capturedFrames.has(url)) return;
  captureAttempted.add(url);
  try {
    const probe = document.createElement("video");
    probe.crossOrigin = "anonymous";
    probe.muted = true;
    probe.playsInline = true;
    // "metadata" + an explicit seek (below) asks the server for a small byte
    // range around that timestamp instead of "auto", which would pull the
    // whole clip just to render one still frame — this capture already adds
    // a second fetch of every unique clip on top of the real feed video's
    // own, and this feed already has a memory/CPU budget problem on long
    // scroll sessions (see the far-viewport video release above); doubling
    // full downloads on top of that would fight the very problem this file
    // exists to fix.
    probe.preload = "metadata";
    const cleanup = () => {
      probe.removeAttribute("src");
      probe.load();
    };
    const grabFrame = () => {
      try {
        const width = Math.min(probe.videoWidth || CAPTURED_FRAME_MAX_DIM, CAPTURED_FRAME_MAX_DIM);
        const scale = width / (probe.videoWidth || width);
        const height = Math.round((probe.videoHeight || width) * scale) || width;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(probe, 0, 0, width, height);
          rememberCapturedFrame(url, canvas.toDataURL("image/jpeg", 0.6));
        }
      } catch {
        // Tainted canvas (no/failed CORS), decode error, etc.
      }
      cleanup();
    };
    probe.addEventListener(
      "loadedmetadata",
      () => {
        // A tiny offset, not 0 — the very first frame of an encoded clip is
        // sometimes black/blank (encoder priming), same reason thumbnail
        // generators generally avoid t=0.
        probe.currentTime = Math.min(0.1, (probe.duration || 0) / 2);
      },
      { once: true },
    );
    probe.addEventListener("seeked", grabFrame, { once: true });
    probe.addEventListener("error", cleanup, { once: true });
    probe.src = url;
  } catch {
    // Video element unsupported in this environment (SSR, older WebView) — skip.
  }
}

export function FeedMedia({
  imageUrl,
  videoUrl,
  className,
  alt = "",
  showControls = true,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  className?: string;
  alt?: string;
  showControls?: boolean;
}) {
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  // `soundEnabled` drives the speaker icon (feed-wide on/off); `isActive` means
  // this clip is the one currently carrying that sound.
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Starts false so a freshly-mounted clip near the viewport (the common
  // case) renders immediately, before the observer below has had a chance to
  // report in.
  const [farFromViewport, setFarFromViewport] = useState(false);
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Subscribe to the feed audio controller + report this clip's visibility.
  useEffect(() => {
    if (!videoUrl) return;
    const sync = () => {
      const enabled = feedAudio.isEnabled();
      const mine = enabled && feedAudio.getActiveId() === instanceId;
      setSoundEnabled(enabled);
      setIsActive(mine);
      const v = videoRef.current;
      if (!v) return;
      v.muted = !mine;
      if (mine) v.play().catch(() => {});
    };
    const unsubscribe = feedAudio.subscribe(sync);

    const el = containerRef.current;
    let observer: IntersectionObserver | undefined;
    let farObserver: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            feedAudio.setVisibility(instanceId, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      observer.observe(el);

      // A long scroll session can leave many autoplaying muted <video>
      // elements mounted at once (no virtualization in the feed), each still
      // decoding frames off-screen — real memory/CPU pressure that
      // contributes to the app becoming unresponsive on long News Feed
      // sessions. This is a second, much looser observer: once a clip is
      // well outside the viewport, drop its `src` so the browser fully
      // releases the decoder; restore it once it's back in range. The
      // generous rootMargin means this only kicks in for clips genuinely far
      // away, not the next one about to scroll into view.
      //
      // The "not intersecting" transition is debounced (going far-away is
      // delayed; coming back into range is immediate). A freshly-`observe()`d
      // element can report a spurious first `isIntersecting: false` before
      // the browser has finished laying it out — acting on that immediately
      // would flip `src` to undefined and back within the same render burst,
      // which forces the browser to restart loading the video from scratch.
      // For a clip sitting at the top of the feed on mount, that reproduces
      // exactly the "video is stuck / reloads every time" symptom this
      // observer was never supposed to cause.
      let farTimer: ReturnType<typeof setTimeout> | undefined;
      farObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (farTimer) {
              clearTimeout(farTimer);
              farTimer = undefined;
            }
            if (entry.isIntersecting) {
              setFarFromViewport(false);
            } else {
              farTimer = setTimeout(() => setFarFromViewport(true), 400);
            }
          }
        },
        { rootMargin: "800px 0px" },
      );
      farObserver.observe(el);
    }

    sync();
    return () => {
      observer?.disconnect();
      farObserver?.disconnect();
      unsubscribe();
      feedAudio.unregister(instanceId);
    };
  }, [videoUrl, instanceId]);

  // Kick off the background frame capture for this clip (see
  // ensureFrameCaptured above) — a no-op if it's already cached or already
  // being attempted. This only warms the cache for a LATER mount of the same
  // clip; it deliberately does not affect this render. Gated on the same
  // "near enough to load" signal as the real video's own src/autoPlay above
  // — without this, every video post in the feed (there's no virtualization;
  // they're all mounted at once) would fire a background fetch on first
  // paint regardless of scroll position, which is exactly the "many videos
  // competing for bandwidth on a long feed" problem the far-viewport release
  // above exists to prevent.
  useEffect(() => {
    if (videoUrl && !farFromViewport) ensureFrameCaptured(videoUrl);
  }, [videoUrl, farFromViewport]);

  const closeExpanded = useCallback(() => setExpanded(false), []);

  // While the in-app overlay is open: close on Android back button (via a pushed
  // history entry) and on Escape, and lock the background from scrolling. The
  // feed stays mounted underneath at its current scroll, so closing returns the
  // member to the exact post.
  useEffect(() => {
    if (!expanded) return;
    window.history.pushState({ feedMediaOverlay: true }, "");
    const onPop = () => setExpanded(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // If we still own the pushed history entry (closed via button/backdrop,
      // not the back gesture), pop it so history stays clean.
      if (window.history.state?.feedMediaOverlay) window.history.back();
    };
  }, [expanded]);

  if (!videoUrl && !imageUrl) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Toggling the feed-wide switch. The most-visible video adopts the sound;
    // this tap is the gesture that unlocks unmuted playback.
    feedAudio.toggle();
  };

  const openFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Every platform uses the in-app overlay so fullscreen always has a visible
    // close (X) and never loses the feed's scroll position. We deliberately do
    // NOT use iOS's native video player here: it has no obvious exit affordance
    // (swipe-down only), which members did not discover.
    setExpanded(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/media relative w-full overflow-hidden",
        videoUrl ? "bg-black" : "bg-muted",
        className,
      )}
      style={{ aspectRatio: String(ratio) }}
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          // Dropping `src` (rather than just pausing) when far off-screen is
          // what actually releases the decoder — a paused-but-sourced video
          // still holds a decoded frame buffer. The poster keeps the frame
          // showing in its place so nothing visibly flashes when scrolled
          // back into range.
          src={farFromViewport ? undefined : videoUrl}
          // Prefer a frame captured earlier THIS session (see
          // ensureFrameCaptured above) over the post's own thumbnail — a clip
          // already watched once shows its last frame instantly on remount
          // instead of going black again while its bytes re-load.
          poster={(videoUrl && capturedFrames.get(videoUrl)) || imageUrl || undefined}
          muted={!isActive}
          loop
          playsInline
          autoPlay={!farFromViewport}
          preload={farFromViewport ? "none" : "metadata"}
          onLoadedMetadata={(e) =>
            setRatio(clampRatio(e.currentTarget.videoWidth, e.currentTarget.videoHeight))
          }
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <img
          src={imageUrl as string}
          alt={alt}
          loading="lazy"
          onLoad={(e) =>
            setRatio(clampRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))
          }
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {showControls && (
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
          {videoUrl && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={t(soundEnabled ? "screens.home.muteVideo" : "screens.home.unmuteVideo")}
              aria-pressed={soundEnabled}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={openFullscreen}
            aria-label={t("screens.home.enterFullscreen")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {expanded &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
            onClick={closeExpanded}
            role="dialog"
            aria-modal="true"
          >
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={imageUrl || undefined}
                className="max-h-full max-w-full"
                autoPlay
                loop
                playsInline
                controls
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={imageUrl as string}
                alt={alt}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeExpanded();
              }}
              aria-label={t("screens.home.exitFullscreen")}
              className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
