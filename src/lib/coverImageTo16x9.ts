/**
 * VTID-02806h — Browser-side conversion of any uploaded cover photo
 * to a 16:9 aspect ratio. Three cases:
 *
 *   1. Already 16:9 (within ±3 %)  → pass through unchanged.
 *   2. Wider than 16:9 (panorama)  → centered horizontal crop.
 *   3. Narrower than 16:9 (portrait, square, 4:3 …)
 *        → letterbox-with-blurred-bg: place the original centered
 *          on a 16:9 canvas; fill the side margins with a heavily
 *          blurred + scaled copy of the same image, so the result
 *          looks intentional (like Spotify / YouTube thumbnails)
 *          and never bare-bars.
 *
 * Phase 2 (follow-up PR) will replace path 3 with a server-side
 * Imagen outpaint that *generates* plausible side content instead
 * of blurring. The classifier output below already includes a
 * `method` field so consumers can branch on the chosen path.
 *
 * Output is always a JPEG blob (good size/quality compromise) at
 * the target 16:9 dimensions, regardless of source format.
 */

export type AspectMethod = "passthrough" | "crop" | "letterbox_blur";

export interface ProcessedCover {
  blob: Blob;
  method: AspectMethod;
  width: number;
  height: number;
  ext: "jpg" | "png" | "webp";
  mime: string;
}

const TARGET_RATIO = 16 / 9;
const TOLERANCE = 0.03; // ±3% counts as already-16:9.

// Output canvas. 1600×900 is plenty for a hero cover image and
// keeps the JPEG payload under ~250 kB at 0.88 quality.
const OUT_W = 1600;
const OUT_H = 900;

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode_failed"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode_failed"))),
      "image/jpeg",
      0.88,
    );
  });
}

/**
 * Decide the conversion method for a given source aspect ratio.
 * Exported so callers can show the chosen method in toasts / logs.
 */
export function classifyAspect(srcW: number, srcH: number): AspectMethod {
  if (srcW <= 0 || srcH <= 0) return "letterbox_blur";
  const r = srcW / srcH;
  if (Math.abs(r - TARGET_RATIO) / TARGET_RATIO <= TOLERANCE) return "passthrough";
  if (r > TARGET_RATIO) return "crop";
  return "letterbox_blur";
}

async function passthrough(file: File, img: HTMLImageElement): Promise<ProcessedCover> {
  // We still re-encode to JPEG to normalise size + strip EXIF orientation
  // so the rendered cover looks the same on every device.
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, 0, 0);
  const blob = await canvasToJpeg(canvas);
  return {
    blob,
    method: "passthrough",
    width: canvas.width,
    height: canvas.height,
    ext: "jpg",
    mime: "image/jpeg",
  };
}

async function centeredCrop(img: HTMLImageElement): Promise<ProcessedCover> {
  // Source is wider than 16:9 — keep full height, crop horizontally.
  const srcH = img.naturalHeight;
  const cropW = Math.round(srcH * TARGET_RATIO);
  const offX = Math.round((img.naturalWidth - cropW) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  ctx.drawImage(img, offX, 0, cropW, srcH, 0, 0, OUT_W, OUT_H);

  const blob = await canvasToJpeg(canvas);
  return {
    blob,
    method: "crop",
    width: OUT_W,
    height: OUT_H,
    ext: "jpg",
    mime: "image/jpeg",
  };
}

async function letterboxWithBlurredBg(img: HTMLImageElement): Promise<ProcessedCover> {
  // Source is narrower than 16:9 (portrait, square, 4:3, …).
  // Strategy: fill the 16:9 canvas with a blurred + zoomed copy of the
  // source as the background, then composite the unblurred source
  // centered on top, contained within the canvas height.

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  // 1) Blurred + cover-fitted background. Scale the image so it
  //    covers the canvas, then heavily blur to wash out detail.
  const srcRatio = img.naturalWidth / img.naturalHeight;
  let bgW: number;
  let bgH: number;
  if (srcRatio > TARGET_RATIO) {
    bgH = OUT_H;
    bgW = bgH * srcRatio;
  } else {
    bgW = OUT_W;
    bgH = bgW / srcRatio;
  }
  const bgX = (OUT_W - bgW) / 2;
  const bgY = (OUT_H - bgH) / 2;
  ctx.save();
  ctx.filter = "blur(28px) saturate(1.05) brightness(0.95)";
  ctx.drawImage(img, bgX, bgY, bgW, bgH);
  ctx.restore();

  // 2) Soft dark vignette to keep the focus on the foreground.
  const grad = ctx.createLinearGradient(0, 0, 0, OUT_H);
  grad.addColorStop(0, "rgba(0,0,0,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // 3) Foreground: contain the source within the canvas height.
  const fgH = OUT_H;
  const fgW = fgH * srcRatio;
  const fgX = (OUT_W - fgW) / 2;
  const fgY = 0;
  ctx.drawImage(img, fgX, fgY, fgW, fgH);

  const blob = await canvasToJpeg(canvas);
  return {
    blob,
    method: "letterbox_blur",
    width: OUT_W,
    height: OUT_H,
    ext: "jpg",
    mime: "image/jpeg",
  };
}

/**
 * Process the given file into a 16:9 cover image. Throws on
 * unrecognised mime or undecodable content; callers should fall back
 * to uploading the original on failure.
 */
export async function processCoverImageTo16x9(file: File): Promise<ProcessedCover> {
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    throw new Error(`unsupported_mime:${file.type}`);
  }
  const img = await loadImage(file);
  const method = classifyAspect(img.naturalWidth, img.naturalHeight);
  if (method === "passthrough") return passthrough(file, img);
  if (method === "crop") return centeredCrop(img);
  return letterboxWithBlurredBg(img);
}
