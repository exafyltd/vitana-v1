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
 * a fullscreen toggle for both photos and videos. The sound preference is
 * remembered across the whole feed via sessionStorage + a window event, so
 * unmuting one clip makes the next ones play with sound too. Every control stops
 * propagation — the card around this frame navigates to the author's profile on
 * click, and the controls must not trigger that.
 */
import { useEffect, useRef, useState } from "react";
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

// --- Feed-wide sound preference -------------------------------------------
// Default OFF (muted) — browsers only allow muted videos to autoplay. Once the
// member unmutes anywhere in the feed we remember it for the session and tell
// every other mounted FeedMedia so they flip too.
const AUDIO_PREF_KEY = "feed_audio_enabled";
const AUDIO_EVENT = "feed-audio-changed";

function readAudioPref(): boolean {
  try {
    return sessionStorage.getItem(AUDIO_PREF_KEY) === "true";
  } catch {
    return false;
  }
}

function writeAudioPref(enabled: boolean): void {
  try {
    sessionStorage.setItem(AUDIO_PREF_KEY, String(enabled));
  } catch {
    /* private mode / storage disabled — fall back to in-memory event only */
  }
  window.dispatchEvent(new CustomEvent<boolean>(AUDIO_EVENT, { detail: enabled }));
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
  // `audioOn` mirrors the feed-wide preference; `muted` on the element follows
  // it but may be forced back on if an unmuted autoplay attempt is rejected.
  const [audioOn, setAudioOn] = useState(readAudioPref);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keep this instance in sync when any other card toggles sound.
  useEffect(() => {
    if (!videoUrl) return;
    const onChange = (e: Event) => {
      const enabled = (e as CustomEvent<boolean>).detail;
      setAudioOn(enabled);
      const v = videoRef.current;
      if (v) {
        v.muted = !enabled;
        if (enabled) v.play().catch(() => {});
      }
    };
    window.addEventListener(AUDIO_EVENT, onChange);
    return () => window.removeEventListener(AUDIO_EVENT, onChange);
  }, [videoUrl]);

  if (!videoUrl && !imageUrl) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !audioOn;
    const v = videoRef.current;
    if (v) {
      v.muted = !next;
      // Unmuting often needs a fresh play() gesture, especially on iOS.
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
    setAudioOn(next);
    writeAudioPref(next);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = containerRef.current;
    const video = videoRef.current;
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }
      if (el?.requestFullscreen) {
        void el.requestFullscreen();
      } else if (video && typeof (video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      }).webkitEnterFullscreen === "function") {
        // iOS Safari: only the <video> element can go fullscreen.
        (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch {
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
          muted={!audioOn}
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
              aria-label={t(audioOn ? "screens.home.muteVideo" : "screens.home.unmuteVideo")}
              aria-pressed={audioOn}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {audioOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
