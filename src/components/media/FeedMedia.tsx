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
 * a fullscreen toggle for both photos and videos.
 *
 * Audio is scroll-following and feed-wide. Browsers only autoplay muted clips,
 * so videos always mount muted. The speaker button is a single GLOBAL mute
 * switch (its first tap is the user gesture that unlocks unmuted playback):
 * once feed sound is on, the most-visible video carries audio and the rest stay
 * muted, so exactly one track ever plays and it follows you as you scroll. Tap
 * any speaker again to turn feed sound back off. Every control stops
 * propagation — the card navigates to the author's profile on click, and the
 * controls must not trigger that.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Maximize2, Volume2, VolumeX } from "lucide-react";
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
        // Nothing is sufficiently on-screen; keep the current clip if it is still
        // visible at all, otherwise go silent until something scrolls into view.
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
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Scroll restore around fullscreen. On Android, exiting element fullscreen
  // snaps the window-scrolled feed back to the top; we save the position when
  // THIS card enters fullscreen and restore it on exit. `enteredFsRef` ensures
  // only the initiating card restores (every mounted card hears the event).
  const scrollYRef = useRef(0);
  const enteredFsRef = useRef(false);

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
    }

    sync();
    return () => {
      observer?.disconnect();
      unsubscribe();
      feedAudio.unregister(instanceId);
    };
  }, [videoUrl, instanceId]);

  // Restore the feed scroll position when leaving fullscreen (Android resets it).
  useEffect(() => {
    if (!videoUrl) return;
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      if (fsEl || !enteredFsRef.current) return;
      enteredFsRef.current = false;
      const y = scrollYRef.current;
      const restore = () => window.scrollTo(0, y);
      restore();
      requestAnimationFrame(restore); // defeat the browser's post-exit scroll nudge
      setTimeout(restore, 250);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [videoUrl]);

  if (!videoUrl && !imageUrl) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Toggling the feed-wide switch. The most-visible video adopts the sound;
    // this tap is the gesture that unlocks unmuted playback.
    feedAudio.toggle();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = containerRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => void })
      | null;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    try {
      const fsEl =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      if (fsEl) {
        void document.exitFullscreen?.();
        return;
      }
      // Save the feed scroll position so we can restore it on exit (Android
      // resets window scroll when leaving fullscreen).
      scrollYRef.current = window.scrollY;
      // Fullscreen the CONTAINER (not the bare <video>) so the overlay sound +
      // fullscreen controls stay visible in fullscreen on Android/desktop.
      if (el?.requestFullscreen) {
        enteredFsRef.current = true;
        void el.requestFullscreen();
      } else if (typeof el?.webkitRequestFullscreen === "function") {
        enteredFsRef.current = true;
        el.webkitRequestFullscreen();
      } else if (video && typeof video.webkitEnterFullscreen === "function") {
        // iOS Safari / Appilix WebView: only the <video> can go fullscreen. The
        // native player handles its own scroll, so no restore needed here.
        video.webkitEnterFullscreen();
      }
    } catch {
      enteredFsRef.current = false;
      /* fullscreen unsupported / blocked — ignore */
    }
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
          src={videoUrl}
          poster={imageUrl || undefined}
          muted={!isActive}
          loop
          playsInline
          autoPlay
          preload="metadata"
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
            onClick={toggleFullscreen}
            aria-label={t("screens.home.enterFullscreen")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
