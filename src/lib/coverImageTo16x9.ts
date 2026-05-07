/**
 * VTID-02806h — Cover-photo conversion to 16:9.
 *
 * Two layers:
 *
 *   1. processCoverImageTo16x9(file)  — pure browser-side; emits a
 *      16:9 JPEG using passthrough / centered-crop /
 *      letterbox-with-blurred-bg-fill depending on the source aspect.
 *      Used everywhere a synchronous "give me 16:9 bytes" answer is
 *      enough (e.g. the per-post composer's `avatars`-bucket path).
 *
 *   2. prepareIntentCoverUpload(args) — high-level orchestrator for
 *      uploads to the `intent-covers` Supabase Storage bucket. For
 *      passthrough / crop sources it renders the JPEG client-side
 *      and uploads directly. For narrower-than-16:9 sources it
 *      uploads the original to `staging/<uid>/...` and calls the
 *      gateway's POST /api/v1/cover-images/outpaint, which extends
 *      the photo to 16:9 via Vertex Imagen and writes the result to
 *      the final path. On any outpaint failure, it falls back to the
 *      client-side letterbox-blur path so the user always gets a
 *      cover.
 *
 * Phase 1 shipped (1) + the letterbox-blur method.
 * Phase 2 (this file) adds (2) — Imagen outpaint via the gateway.
 */

import { supabase } from "@/integrations/supabase/client";
import { communityFetch } from "@/lib/community-gateway";

export type AspectMethod =
  | "passthrough"
  | "crop"
  | "letterbox_blur"
  | "outpaint";

export interface ProcessedCover {
  blob: Blob;
  method: Exclude<AspectMethod, "outpaint">;
  width: number;
  height: number;
  ext: "jpg" | "png" | "webp";
  mime: string;
}

const TARGET_RATIO = 16 / 9;
const TOLERANCE = 0.03; // ±3 % counts as already-16:9.

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

export function classifyAspect(
  srcW: number,
  srcH: number,
): "passthrough" | "crop" | "letterbox_blur" {
  if (srcW <= 0 || srcH <= 0) return "letterbox_blur";
  const r = srcW / srcH;
  if (Math.abs(r - TARGET_RATIO) / TARGET_RATIO <= TOLERANCE) return "passthrough";
  if (r > TARGET_RATIO) return "crop";
  return "letterbox_blur";
}

async function passthrough(_file: File, img: HTMLImageElement): Promise<ProcessedCover> {
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
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

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

  const grad = ctx.createLinearGradient(0, 0, 0, OUT_H);
  grad.addColorStop(0, "rgba(0,0,0,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

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

// ────────────────────────────────────────────────────────────────────
// Phase-2 orchestrator: prepareIntentCoverUpload
// Tries gateway Imagen outpaint for narrower-than-16:9 sources;
// otherwise (and on outpaint failure) renders 16:9 client-side and
// uploads directly to the intent-covers bucket.
// ────────────────────────────────────────────────────────────────────

const INTENT_COVERS_BUCKET = "intent-covers";

export interface PrepareCoverArgs {
  file: File;
  userId: string;
  /**
   * Path PREFIX inside the intent-covers bucket — without a file
   * extension. The orchestrator appends `.jpg` (client paths) or
   * `.png` (outpaint path) and returns the full URL of whichever
   * was used. Examples:
   *   `user-universal/${uid}/${Date.now()}`
   *   `user-library/${uid}/${photoId}`
   */
  targetPathPrefix: string;
}

export interface PrepareCoverResult {
  url: string;
  method: AspectMethod;
}

async function uploadStaged(
  file: File,
  userId: string,
): Promise<{ stagedPath: string }> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const stagedPath = `staging/${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const { error } = await supabase.storage
    .from(INTENT_COVERS_BUCKET)
    .upload(stagedPath, blob, { upsert: true, contentType: file.type });
  if (error) throw error;
  return { stagedPath };
}

async function uploadProcessed(
  processed: ProcessedCover,
  targetPath: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(INTENT_COVERS_BUCKET)
    .upload(targetPath, processed.blob, {
      upsert: true,
      contentType: processed.mime,
    });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from(INTENT_COVERS_BUCKET).getPublicUrl(targetPath);
  return publicUrl;
}

async function callGatewayOutpaint(args: {
  sourcePath: string;
  targetPath: string;
}): Promise<string> {
  const res = await communityFetch("/api/v1/cover-images/outpaint", {
    method: "POST",
    body: JSON.stringify({
      source_path: args.sourcePath,
      target_path: args.targetPath,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `outpaint ${res.status}: ${err.error ?? err.message ?? res.statusText}`,
    );
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("outpaint returned no url");
  return json.url;
}

/**
 * High-level: take a user-picked file, ensure the result is a 16:9
 * cover photo on the intent-covers bucket, and return its public URL.
 */
export async function prepareIntentCoverUpload(
  args: PrepareCoverArgs,
): Promise<PrepareCoverResult> {
  const { file, userId, targetPathPrefix } = args;

  // We need to know the aspect to decide the path. Decode once.
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    throw new Error(`unsupported_mime:${file.type}`);
  }
  const img = await loadImage(file);
  const method = classifyAspect(img.naturalWidth, img.naturalHeight);

  // Passthrough + crop: render JPEG client-side, upload directly.
  if (method === "passthrough" || method === "crop") {
    const processed =
      method === "passthrough" ? await passthrough(file, img) : await centeredCrop(img);
    const url = await uploadProcessed(processed, `${targetPathPrefix}.jpg`);
    return { url, method };
  }

  // Narrow source: try server-side Imagen outpaint first.
  try {
    const { stagedPath } = await uploadStaged(file, userId);
    const url = await callGatewayOutpaint({
      sourcePath: stagedPath,
      targetPath: `${targetPathPrefix}.png`,
    });
    return { url, method: "outpaint" };
  } catch (err) {
    console.warn("[cover] outpaint failed, falling back to letterbox-blur:", err);
    const processed = await letterboxWithBlurredBg(img);
    const url = await uploadProcessed(processed, `${targetPathPrefix}.jpg`);
    return { url, method: "letterbox_blur" };
  }
}
