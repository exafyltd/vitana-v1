/**
 * Client-side image downscale + compression for cover/thumbnail uploads.
 *
 * Goal: accept ANY image the user picks (a 12 MP phone photo is often
 * 5–10 MB) and transparently shrink it to something small enough to
 * upload, instead of rejecting it with a hard size cap.
 *
 * Aspect ratio is always preserved. The longest edge is clamped to
 * `maxEdge`, then the image is re-encoded as JPEG. If the first encode
 * is still above `maxBytes`, quality is stepped down until it fits (or
 * the quality floor is reached).
 *
 * This is intentionally separate from `coverImageTo16x9.ts`, which
 * *reframes* images to a fixed 16:9 ratio. Here we only resize/compress
 * and keep the user's original framing.
 */

export interface ResizeImageOptions {
  /** Clamp the longest edge (px) to this value. Default 1920. */
  maxEdge?: number;
  /** Initial JPEG quality (0–1). Default 0.85. */
  quality?: number;
  /** Target max output size in bytes. Default 2 MB. */
  maxBytes?: number;
  /** Lowest JPEG quality we'll drop to while trying to hit maxBytes. Default 0.5. */
  minQuality?: number;
}

const DEFAULTS: Required<ResizeImageOptions> = {
  maxEdge: 1920,
  quality: 0.85,
  maxBytes: 2 * 1024 * 1024,
  minQuality: 0.5,
};

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode_failed'));
    };
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode_failed'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Resize + compress an image file. Returns a new JPEG `File`.
 *
 * Falls back to returning the original file untouched if the browser
 * can't decode/encode it (e.g. canvas unavailable) so the caller's
 * upload still has something to send.
 */
export async function resizeImageFile(
  file: File,
  options: ResizeImageOptions = {},
): Promise<File> {
  const { maxEdge, quality, maxBytes, minQuality } = { ...DEFAULTS, ...options };

  // Non-images (or SVG/GIF which we don't want to flatten) — leave alone.
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // can't decode — let the caller try the original
  }

  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) return file;

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  // Already small enough in BOTH dimensions and bytes — keep original.
  if (scale === 1 && file.size <= maxBytes) return file;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let q = quality;
  let blob: Blob;
  try {
    blob = await canvasToJpeg(canvas, q);
    // Step quality down until under the byte budget or we hit the floor.
    while (blob.size > maxBytes && q > minQuality) {
      q = Math.max(minQuality, q - 0.1);
      blob = await canvasToJpeg(canvas, q);
    }
  } catch {
    return file;
  }

  // If, somehow, the re-encode is larger than the source, keep the source.
  if (blob.size >= file.size && scale === 1) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
