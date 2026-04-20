/**
 * Capture N JPEG keyframes from a video File, client-side, via a hidden
 * <video> + <canvas> pair.
 *
 * Shared between:
 *   - useBulkVideoUpload.generateAutoThumbnails (lets the user pick 1 of 3)
 *   - useAutoShortMetadata (sends 3 frames to the gateway for LLM analysis)
 *
 * The seek/draw logic here mirrors the implementation that's been shipping
 * in useBulkVideoUpload.ts — don't refactor seek ordering, readyState gates,
 * or the JPEG quality without testing on mobile Safari.
 */

export type CaptureOptions = {
  /**
   * Fractions of the video duration at which to sample (0..1). Defaults to
   * [0.2, 0.5, 0.8]. The order of results matches the order of positions.
   */
  positions?: number[];
  /** JPEG quality (0..1). Default 0.9. */
  quality?: number;
  /** Abort hard if a single seek takes longer than this (ms). Default 8000. */
  perSeekTimeoutMs?: number;
};

const DEFAULT_POSITIONS = [0.2, 0.5, 0.8];

export async function captureKeyframes(
  file: File,
  options: CaptureOptions = {},
): Promise<string[]> {
  const positions = options.positions ?? DEFAULT_POSITIONS;
  const quality = options.quality ?? 0.9;
  const perSeekTimeoutMs = options.perSeekTimeoutMs ?? 8000;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const thumbnails: string[] = [];
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    let watchdog: number | undefined;

    const finish = (out: string[]) => {
      if (settled) return;
      settled = true;
      if (watchdog !== undefined) window.clearTimeout(watchdog);
      URL.revokeObjectURL(objectUrl);
      resolve(out);
    };

    const armWatchdog = () => {
      if (watchdog !== undefined) window.clearTimeout(watchdog);
      watchdog = window.setTimeout(() => {
        finish(thumbnails);
      }, perSeekTimeoutMs);
    };

    video.preload = 'metadata';
    video.muted = true;
    // @ts-ignore — iOS Safari requires playsInline on the element
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        finish([]);
        return;
      }
      let captured = 0;

      video.onseeked = () => {
        if (ctx && video.readyState >= 2) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnails.push(canvas.toDataURL('image/jpeg', quality));
        }
        captured += 1;

        if (captured < positions.length) {
          armWatchdog();
          video.currentTime = duration * positions[captured];
        } else {
          finish(thumbnails);
        }
      };

      armWatchdog();
      video.currentTime = duration * positions[0];
    };

    video.onerror = () => finish([]);
    video.src = objectUrl;
  });
}

/**
 * Read the duration of a video File in seconds. Returns 0 if unreadable.
 */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
    video.src = objectUrl;
  });
}
