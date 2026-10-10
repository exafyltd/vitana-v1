/**
 * VTID-05036 — shrink an item photo in the browser before it is uploaded.
 *
 * The gateway caps the decoded image at 1,468,006 bytes (1.4 MB) so the base64
 * JSON body stays under its 2 MB express.json limit (VTID-05035). The photo is
 * scaled to a longest side of 1600 px and encoded as WebP (JPEG where the
 * browser cannot encode WebP), quality 0.85 first, then lower until it fits.
 */

export const MAX_ITEM_IMAGE_BYTES = 1_468_006;
export const MAX_ITEM_IMAGE_SIDE = 1600;
export const START_QUALITY = 0.85;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
// A huge, noisy photo can stay over the cap at the lowest quality; then the
// dimensions shrink too, so the loop always ends.
const SCALE_STEPS = [1, 0.75, 0.5, 0.35];

export type EncodedType = 'image/webp' | 'image/jpeg';

/** Dimensions that fit inside `max` × `max`, keeping the aspect ratio; never upscales. */
export function fitWithin(width: number, height: number, max = MAX_ITEM_IMAGE_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest <= 0) return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  const ratio = max / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/**
 * The size loop, free of any browser API: asks `encode` for the photo at
 * falling quality (then falling scale) until a result is ≤ `maxBytes`.
 */
export async function shrinkToLimit(
  encode: (quality: number, scale: number) => Promise<Blob | null>,
  maxBytes = MAX_ITEM_IMAGE_BYTES,
): Promise<Blob> {
  for (const scale of SCALE_STEPS) {
    for (const quality of QUALITY_STEPS) {
      const blob = await encode(quality, scale);
      if (blob && blob.size > 0 && blob.size <= maxBytes) return blob;
    }
  }
  throw new Error('IMAGE_TOO_LARGE');
}

/** A decoded picture the canvas can draw. */
export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close?: () => void;
}

/** The browser pieces shrinkImage needs; tests pass fakes. */
export interface ShrinkDeps {
  decode: (file: Blob) => Promise<DecodedImage>;
  createCanvas: (width: number, height: number) => HTMLCanvasElement;
}

async function decodeInBrowser(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { width: bmp.width, height: bmp.height, source: bmp, close: () => bmp.close() };
    } catch {
      // fall through to <img>, which some browsers decode where createImageBitmap does not
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('IMAGE_PROCESSING_FAILED'));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, source: img };
  } finally {
    // The <img> keeps its decoded pixels after the URL is revoked.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

const browserDeps: ShrinkDeps = {
  decode: decodeInBrowser,
  createCanvas: (width, height) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  },
};

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Shrinks `file` to ≤ 1.4 MB: longest side 1600 px, WebP (or JPEG), quality
 * from 0.85 down. Throws IMAGE_PROCESSING_FAILED when the file cannot be
 * decoded and IMAGE_TOO_LARGE when even the smallest step is over the cap.
 */
export async function shrinkImage(file: Blob, deps: ShrinkDeps = browserDeps): Promise<{ blob: Blob; type: EncodedType }> {
  let decoded: DecodedImage;
  try {
    decoded = await deps.decode(file);
  } catch {
    throw new Error('IMAGE_PROCESSING_FAILED');
  }
  const base = fitWithin(decoded.width, decoded.height);
  // A browser that cannot encode WebP silently returns PNG; from then on JPEG.
  let type: EncodedType = 'image/webp';
  const canvases = new Map<number, HTMLCanvasElement>();
  const canvasAt = (scale: number): HTMLCanvasElement => {
    let c = canvases.get(scale);
    if (!c) {
      const w = Math.max(1, Math.round(base.width * scale));
      const h = Math.max(1, Math.round(base.height * scale));
      c = deps.createCanvas(w, h);
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('IMAGE_PROCESSING_FAILED');
      // JPEG has no alpha: a transparent PNG would turn black without a background.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(decoded.source, 0, 0, w, h);
      canvases.set(scale, c);
    }
    return c;
  };

  try {
    const blob = await shrinkToLimit(async (quality, scale) => {
      const canvas = canvasAt(scale);
      if (type === 'image/webp') {
        const webp = await toBlob(canvas, 'image/webp', quality);
        if (webp && webp.type === 'image/webp') return webp;
        type = 'image/jpeg';
      }
      return toBlob(canvas, 'image/jpeg', quality);
    });
    return { blob, type: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg' };
  } finally {
    decoded.close?.();
  }
}

/** The blob's bytes as plain base64 (no `data:` prefix), as the gateway expects. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('IMAGE_PROCESSING_FAILED'));
    reader.onload = () => {
      const s = String(reader.result ?? '');
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Shrink + encode: the body for POST /admin/rewards/items/image. */
export async function prepareItemImage(file: Blob, deps?: ShrinkDeps): Promise<{ content_type: EncodedType; data_base64: string }> {
  const { blob, type } = await shrinkImage(file, deps);
  return { content_type: type, data_base64: await blobToBase64(blob) };
}
