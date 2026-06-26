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
 * a fullscreen toggle for both photos and videos. Audio is single-active across
 * the whole feed — only one clip plays sound at a time. Unmuting a card mutes
 * whichever other card was sounding, so the grid of autoplaying previews never
 * blasts several audio tracks at once. Every control stops propagation — the
 * card around this frame navigates to the author's profile on click, and the
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

// --- Single-active feed audio ---------------------------------------------
// Videos autoplay muted (the only state browsers allow without a gesture). The
// feed mounts many of them at once, so we let exactly ONE carry sound: tapping a
// card's unmute makes it the active source and mutes whatever was sounding
// before. `activeAudioId` holds that source's id; a window event fans the change
// out to every mounted FeedMedia so each can mute/unmute itself accordingly.
const AUDIO_EVENT = "feed-audio-active-changed";
let activeAudioId: string | null = null;

function setActiveAudio(id: string | null): void {
  activeAudioId = id;
  window.dispatchEvent(new CustomEvent<string | null>(AUDIO_EVENT, { detail: id }));
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
  // `audioOn` = this clip is the single active audio source. Videos still mount
  // muted+autoplaying; sound is opt-in per tap and only ever one at a time.
  const [audioOn, setAudioOn] = useState(false);
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // React to the active-audio source changing anywhere in the feed: become the
  // sounding clip if it's us, otherwise mute. Also self-mutes when another card
  // takes over, which is what prevents overlapping audio.
  useEffect(() => {
    if (!videoUrl) return;
    const apply = (active: string | null) => {
      const mine = active === instanceId;
      setAudioOn(mine);
      const v = videoRef.current;
      if (!v) return;
      v.muted = !mine;
      if (mine) v.play().catch(() => {});
    };
    const onChange = (e: Event) => apply((e as CustomEvent<string | null>).detail);
    window.addEventListener(AUDIO_EVENT, onChange);
    return () => {
      window.removeEventListener(AUDIO_EVENT, onChange);
      // If this sounding clip unmounts (scrolled away), release audio ownership.
      if (activeAudioId === instanceId) setActiveAudio(null);
    };
  }, [videoUrl, instanceId]);

  if (!videoUrl && !imageUrl) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Tapping is a user gesture, so unmuted playback is allowed. Claim audio
    // (mutes any other sounding card via the event) or release it.
    setActiveAudio(audioOn ? null : instanceId);
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
