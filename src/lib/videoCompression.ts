/**
 * Client-side video compression for post uploads.
 *
 * The `media-uploads` Supabase bucket rejects files over 50 MB, so a user who
 * records a longer/higher-bitrate clip on their phone cannot post it. Rather
 * than block them, we transcode the video in the browser with ffmpeg.wasm down
 * to H.264/AAC MP4 at a bitrate computed from the clip duration, so the result
 * lands safely under the 50 MB cap while staying universally playable (MP4 H.264
 * plays in the Android WebView, desktop browsers and iOS — unlike a WebM/VP8
 * MediaRecorder output which iOS cannot play).
 *
 * The ffmpeg core (~32 MB wasm) is self-hosted (emitted by Vite as a same-origin
 * asset — no CDN) and lazy-loaded only the first time a user actually needs
 * compression, then cached for the session.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
// Self-hosted single-thread core (no SharedArrayBuffer / COOP-COEP needed).
// `?url` makes Vite emit these as fingerprinted, same-origin assets. The bare
// specifiers resolve via the package `exports` map to the ESM build (the module
// worker loads the core with `import()`, so it needs ESM, not UMD).
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

/** Hard ceiling enforced by the storage bucket. */
export const BUCKET_MAX_BYTES = 50 * 1024 * 1024;
/** We aim a little under the ceiling to absorb muxing/keyframe overhead. */
const TARGET_BYTES = 48 * 1024 * 1024;
/** Largest input we'll attempt to load into wasm memory before giving up. */
export const MAX_COMPRESSIBLE_BYTES = 300 * 1024 * 1024;
const DEFAULT_AUDIO_BITRATE = 128_000;
const MAX_LONGEST_SIDE = 1280;

export interface VideoMeta {
  duration: number;
  width: number;
  height: number;
}

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(coreURL, 'text/javascript'),
        wasmURL: await toBlobURL(wasmURL, 'application/wasm'),
      });
      ffmpegInstance = ff;
      return ff;
    })();
  }
  return loadPromise;
}

/** Read duration + intrinsic dimensions from a video file via a hidden element. */
export function getVideoMetadata(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const meta: VideoMeta = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(video.src);
      if (!meta.duration || !Number.isFinite(meta.duration) || meta.duration <= 0) {
        reject(new Error('Could not read video duration'));
      } else {
        resolve(meta);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Could not read video metadata'));
    };
    video.src = URL.createObjectURL(file);
  });
}

/** Scale dimensions so the longest side fits `longestSide`, keeping even numbers. */
function targetDimensions(width: number, height: number, longestSide: number) {
  const longest = Math.max(width, height) || longestSide;
  const scale = longest > longestSide ? longestSide / longest : 1;
  return {
    w: Math.max(2, Math.round((width * scale) / 2) * 2),
    h: Math.max(2, Math.round((height * scale) / 2) * 2),
  };
}

export interface CompressOptions {
  /** 0..1 transcode progress callback. */
  onProgress?: (ratio: number) => void;
  targetBytes?: number;
}

/**
 * Transcode `file` to an MP4 under the bucket limit. Throws if the result still
 * can't be brought under 50 MB (extremely long/complex source) so the caller can
 * show a friendly "pick a shorter video" message.
 */
export async function compressVideoUnderLimit(file: File, opts: CompressOptions = {}): Promise<File> {
  const targetBytes = opts.targetBytes ?? TARGET_BYTES;
  const meta = await getVideoMetadata(file);
  const ffmpeg = await getFFmpeg();

  const runPass = async (longestSide: number, audioBitrate: number, safety: number): Promise<Uint8Array> => {
    const { w: outW, h: outH } = targetDimensions(meta.width, meta.height, longestSide);
    const totalBudget = Math.floor((targetBytes * 8 * safety) / meta.duration);
    const videoBitrate = Math.max(120_000, totalBudget - audioBitrate);

    await ffmpeg.writeFile('input', await fetchFile(file));

    const handleProgress = ({ progress }: { progress: number }) => {
      if (opts.onProgress) opts.onProgress(Math.min(1, Math.max(0, progress)));
    };
    ffmpeg.on('progress', handleProgress);
    try {
      await ffmpeg.exec([
        '-i', 'input',
        '-vf', `scale=${outW}:${outH}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-profile:v', 'main',
        '-pix_fmt', 'yuv420p',
        '-b:v', String(videoBitrate),
        '-maxrate', String(Math.round(videoBitrate * 1.45)),
        '-bufsize', String(Math.round(videoBitrate * 2)),
        '-c:a', 'aac',
        '-b:a', `${Math.round(audioBitrate / 1000)}k`,
        '-ac', '2',
        '-movflags', '+faststart',
        'output.mp4',
      ]);
    } finally {
      ffmpeg.off('progress', handleProgress);
    }

    const data = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    await ffmpeg.deleteFile('input').catch(() => {});
    await ffmpeg.deleteFile('output.mp4').catch(() => {});
    return data;
  };

  // Pass 1: 720p-class, full audio.
  let data = await runPass(MAX_LONGEST_SIDE, DEFAULT_AUDIO_BITRATE, 0.92);
  // Pass 2 (only if still over): smaller frame, lighter audio, tighter budget.
  if (data.byteLength > targetBytes) {
    data = await runPass(854, 96_000, 0.85);
  }
  if (data.byteLength > BUCKET_MAX_BYTES) {
    throw new Error('Compressed video still exceeds the 50MB limit');
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'video';
  return new File([data], `${base}.mp4`, { type: 'video/mp4' });
}
