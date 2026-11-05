/**
 * VTID-05429 (Native Wave 2, profile lane) — the profile's media upload port
 * (design.md 2a: avatar / cover / gallery uploads through `expo-image-picker`
 * and the native upload path).
 *
 * Two halves:
 *  - `pickProfileImages` — the device picker (replaces the web hidden
 *    `<input type="file" accept="image/…">`): asks for the photo-library
 *    permission, opens the library, returns the picked images with their
 *    base64, mime type, file name and pixel size. The usage strings are the
 *    `expo-image-picker` config plugin in app.config.ts (diary lane, VTID-05426).
 *  - Pure request builders, IO-free: each returns the exact storage upload,
 *    table write or gateway call the web makes for the same action
 *    (`IdentityForm.uploadFile`, `useProfileGallery.uploadPhoto` /
 *    `deletePhoto`, `CoverLibraryDrawer` + `coverImageTo16x9.ts`,
 *    `profilePrefsApi.ts`). The profile data layer sends them
 *    (screens/profile/data/uploads.ts); the unit tests assert them against a
 *    fake client / gateway and never fire one (requirements R5.2).
 */
import * as ImagePicker from 'expo-image-picker';

export type ProfileImage = { uri: string; base64: string; mimeType: string; fileName: string; width: number; height: number };
export type ProfilePickResult = { status: 'picked'; images: ProfileImage[] } | { status: 'cancelled' } | { status: 'denied' };

/** Opens the photo library (one image, or several for the gallery) and returns the images with base64. */
export async function pickProfileImages({ multiple = false }: { multiple?: boolean } = {}): Promise<ProfilePickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied' };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8, allowsMultipleSelection: multiple });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const images = result.assets
    .filter((a) => typeof a.base64 === 'string' && a.base64.length > 0)
    .map((a, i) => {
      const mimeType = a.mimeType ?? 'image/jpeg';
      const sub = mimeType.split('/')[1] ?? 'jpg';
      return {
        uri: a.uri,
        base64: a.base64 as string,
        mimeType,
        fileName: a.fileName ?? `photo-${i + 1}.${sub === 'jpeg' ? 'jpg' : sub}`,
        width: a.width ?? 0,
        height: a.height ?? 0,
      };
    });
  return images.length ? { status: 'picked', images } : { status: 'cancelled' };
}

// ── file checks (web `IdentityForm.handleFileSelected`, `CoverLibraryDrawer`, `PhotoUploadDialog`) ──

/** Web `file.name.split('.').pop()`, lower-cased; the mime subtype when the name has no extension. */
export function fileExtOf(image: Pick<ProfileImage, 'fileName' | 'mimeType'>): string {
  const parts = image.fileName.split('.');
  if (parts.length > 1) return (parts.pop() ?? '').toLowerCase();
  const sub = (image.mimeType.split('/')[1] ?? '').toLowerCase();
  return sub === 'jpeg' ? 'jpg' : sub;
}

export function isHeic(image: Pick<ProfileImage, 'fileName' | 'mimeType'>): boolean {
  const ext = fileExtOf(image);
  return image.mimeType === 'image/heic' || image.mimeType === 'image/heif' || ext === 'heic' || ext === 'heif';
}

/** Avatar formats (web IdentityForm `allowedExtensions`). */
export const AVATAR_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;
/** Cover formats (web CoverLibraryDrawer `ALLOWED_EXTS`). */
export const COVER_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
/** Gallery mime types (web PhotoUploadDialog `ACCEPTED_TYPES`). */
export const GALLERY_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** 'heic' (web toast heicheif…), 'unsupported', or 'ok' for an avatar / cover pick. */
export function checkImage(image: ProfileImage, exts: readonly string[]): 'ok' | 'heic' | 'unsupported' {
  if (isHeic(image)) return 'heic';
  if (!image.mimeType.startsWith('image/') || !exts.includes(fileExtOf(image))) return 'unsupported';
  return 'ok';
}

// ── storage uploads ──

export type StorageUpload = { bucket: string; path: string; contentType: string; upsert?: boolean };

export const AVATARS_BUCKET = 'avatars';
export const MEDIA_UPLOADS_BUCKET = 'media-uploads';
export const INTENT_COVERS_BUCKET = 'intent-covers';

/** Web `IdentityForm.uploadFile(file, 'avatars', 'avatar')`: `<uid>/avatar-<ms>.<ext>`, upsert. */
export function buildAvatarUpload(userId: string, image: ProfileImage, now: Date = new Date()): StorageUpload {
  return { bucket: AVATARS_BUCKET, path: `${userId}/avatar-${now.getTime()}.${fileExtOf(image)}`, contentType: image.mimeType, upsert: true };
}

/** Web `useProfileGallery.uploadPhoto`: `media-uploads/<uid>/gallery/<uuid>.<ext>` (ext defaults to jpg). */
export function buildGalleryUpload(userId: string, image: ProfileImage, id: string): StorageUpload {
  return { bucket: MEDIA_UPLOADS_BUCKET, path: `${userId}/gallery/${id}.${fileExtOf(image) || 'jpg'}`, contentType: image.mimeType };
}

/** Web `classifyAspect` (coverImageTo16x9.ts): ±3 % of 16:9 passes, wider crops, narrower is extended. */
export function classifyAspect(w: number, h: number): 'passthrough' | 'crop' | 'letterbox_blur' {
  if (w <= 0 || h <= 0) return 'letterbox_blur';
  const target = 16 / 9;
  const r = w / h;
  if (Math.abs(r - target) / target <= 0.03) return 'passthrough';
  if (r > target) return 'crop';
  return 'letterbox_blur';
}

/** Web cover path prefixes (no extension): universal `user-universal/<uid>/<ms>`, library `user-library/<uid>/<uuid>`. */
export const universalCoverPrefix = (userId: string, now: Date = new Date()) => `user-universal/${userId}/${now.getTime()}`;
export const libraryCoverPrefix = (userId: string, id: string) => `user-library/${userId}/${id}`;

/**
 * The file a cover upload writes at `<prefix>.<ext>`, upsert (web
 * `uploadToIntentCovers` direct path). The web re-encodes a 16:9 or wider
 * source to JPEG on a canvas first; there is no canvas natively, so the
 * picked bytes go up as they are (the web's own raw-upload fallback).
 */
export function buildCoverUpload(prefix: string, image: ProfileImage): StorageUpload {
  return { bucket: INTENT_COVERS_BUCKET, path: `${prefix}.${fileExtOf(image) || 'bin'}`, contentType: image.mimeType, upsert: true };
}

/** Web `uploadStaged`: a narrower-than-16:9 source goes to `staging/<uid>/<ms>-<6 chars>.<ext>` before the outpaint. */
export function buildStagedCoverUpload(userId: string, image: ProfileImage, now: Date = new Date(), rand: string = Math.random().toString(36).slice(2, 8)): StorageUpload {
  return { bucket: INTENT_COVERS_BUCKET, path: `staging/${userId}/${now.getTime()}-${rand}.${fileExtOf(image) || 'bin'}`, contentType: image.mimeType, upsert: true };
}

// ── gateway calls (paths relative to /api/v1, which the native gateway fetch adds) ──

export type GatewayCall = { path: string; init: { method: 'GET' | 'POST' | 'PATCH'; body?: string } };

/** Web `callGatewayOutpaint`: POST /api/v1/cover-images/outpaint `{ source_path, target_path }` (target `<prefix>.png`). */
export function buildOutpaintCall(sourcePath: string, prefix: string): GatewayCall {
  return { path: '/cover-images/outpaint', init: { method: 'POST', body: JSON.stringify({ source_path: sourcePath, target_path: `${prefix}.png` }) } };
}

/** Web `getIntentCategories()`: GET /api/v1/intent-categories. */
export const INTENT_CATEGORIES_CALL: GatewayCall = { path: '/intent-categories', init: { method: 'GET' } };
