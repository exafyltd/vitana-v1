/**
 * VTID-05429 (Native Wave 2, profile lane) — the profile media writes, sent
 * through the app's one Supabase client and the gateway fetch. The requests
 * themselves are built by the pure builders in `src/ports/profile-media.ts`
 * (storage paths, gateway calls) and below (table writes); this file only
 * sends them. Native twins of:
 *
 *  - `IdentityForm.uploadFile` — avatar to the public `avatars` bucket, then
 *    `getPublicUrl` (the Identity save persists the url, data/profile.ts);
 *  - `useProfileGallery.uploadPhoto` / `deletePhoto` — `media-uploads` +
 *    a `profile_gallery` INSERT (`sort_order` = current photo count), DELETE by id;
 *  - `CoverLibraryDrawer` + `coverImageTo16x9.prepareIntentCoverUpload` —
 *    the `intent-covers` bucket, `profiles.universal_intent_cover_url`,
 *    `user_intent_cover_library` INSERT / DELETE, the
 *    `POST /api/v1/cover-images/outpaint` step for narrower-than-16:9 photos,
 *    and `GET /api/v1/intent-categories`.
 *
 * Tests assert every built request on the client / gateway doubles; nothing
 * is sent anywhere (requirements R5.2).
 */
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import {
  INTENT_CATEGORIES_CALL,
  buildCoverUpload,
  buildOutpaintCall,
  buildStagedCoverUpload,
  classifyAspect,
  type GatewayCall,
  type ProfileImage,
  type StorageUpload,
} from '../../../ports/profile-media';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const db = () => getSupabase() as unknown as { from: (table: string) => any; storage: { from: (bucket: string) => any } };

/** base64 → bytes (Hermes and node both have `atob`). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A v4 id for the gallery / library object names (web `uuidv4()` / `crypto.randomUUID()`). */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Uploads the picked bytes as the built request says and returns the object's public url. */
export async function runStorageUpload(req: StorageUpload, image: ProfileImage): Promise<string> {
  const bucket = db().storage.from(req.bucket);
  const options: Row = { contentType: req.contentType };
  if (req.upsert) options.upsert = true;
  const { error } = await bucket.upload(req.path, base64ToBytes(image.base64), options);
  if (error) throw new Error(error.message ?? 'upload failed');
  return bucket.getPublicUrl(req.path).data.publicUrl as string;
}

/** Sends a built gateway call with the community-gateway headers (web `communityFetch`). */
export async function runGatewayCall<T>(call: GatewayCall): Promise<T> {
  const headers: Record<string, string> = { 'X-Vitana-Active-Role': 'community' };
  if (typeof call.init.body === 'string') headers['Content-Type'] = 'application/json';
  const res = await getGateway()(call.path, { ...call.init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) throw new Error(`${call.path} ${res.status}`);
  return body as T;
}

// ── gallery (web useProfileGallery) ──

export type GalleryInsert = { table: 'profile_gallery'; values: { user_id: string; image_url: string; caption?: string; is_public: boolean; sort_order: number } };

export function buildGalleryInsert(userId: string, imageUrl: string, caption: string | undefined, isPublic: boolean, sortOrder: number): GalleryInsert {
  return { table: 'profile_gallery', values: { user_id: userId, image_url: imageUrl, caption, is_public: isPublic, sort_order: sortOrder } };
}

export async function runGalleryInsert(req: GalleryInsert): Promise<void> {
  const { error } = await db().from(req.table).insert(req.values).select().single();
  if (error) throw new Error(error.message ?? 'insert failed');
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  const { error } = await db().from('profile_gallery').delete().eq('id', id);
  if (error) throw new Error(error.message ?? 'delete failed');
}

// ── cover library (web CoverLibraryDrawer) ──

export interface CoverLibraryRow {
  id: string;
  category: string;
  cover_url: string;
}
export interface IntentCategory {
  category_key: string;
  label: string;
}

/** Drawer load: the universal url, the library rows (newest first) and the categories (soft-fail to empty, as the web). */
export async function loadCoverLibrary(userId: string): Promise<{ universalUrl: string | null; rows: CoverLibraryRow[]; categories: IntentCategory[] }> {
  const [profile, rows, cats] = await Promise.all([
    db().from('profiles').select('universal_intent_cover_url').eq('user_id', userId).maybeSingle(),
    db().from('user_intent_cover_library').select('id, category, cover_url').eq('user_id', userId).order('created_at', { ascending: false }),
    runGatewayCall<{ categories?: IntentCategory[] }>(INTENT_CATEGORIES_CALL).catch(() => ({ categories: [] })),
  ]);
  return {
    universalUrl: ((profile?.data as Row | null)?.universal_intent_cover_url as string | null | undefined) ?? null,
    rows: ((rows?.data as CoverLibraryRow[] | null) ?? []) as CoverLibraryRow[],
    categories: Array.isArray(cats?.categories) ? cats.categories : [],
  };
}

/**
 * Web `prepareIntentCoverUpload` → public url. 16:9 or wider: the direct
 * upload to `<prefix>.<ext>`. Narrower: staged upload + gateway outpaint to
 * `<prefix>.png`; when the outpaint fails, the direct upload (the web falls
 * back to a client-side letterbox render; natively the photo goes up as is).
 */
export async function uploadIntentCover(userId: string, prefix: string, image: ProfileImage): Promise<string> {
  if (classifyAspect(image.width, image.height) !== 'letterbox_blur') return runStorageUpload(buildCoverUpload(prefix, image), image);
  try {
    const staged = buildStagedCoverUpload(userId, image);
    await runStorageUpload(staged, image);
    const out = await runGatewayCall<{ url?: string }>(buildOutpaintCall(staged.path, prefix));
    if (!out?.url) throw new Error('outpaint returned no url');
    return out.url;
  } catch {
    return runStorageUpload(buildCoverUpload(prefix, image), image);
  }
}

/** `profiles.universal_intent_cover_url` set / cleared (web: update(...).eq('user_id', uid), no updated_at). */
export function buildUniversalCoverUpdate(userId: string, url: string | null) {
  return { table: 'profiles' as const, values: { universal_intent_cover_url: url }, match: { user_id: userId } };
}

export async function runUniversalCoverUpdate(req: ReturnType<typeof buildUniversalCoverUpdate>): Promise<void> {
  const { error } = await db().from(req.table).update(req.values).eq('user_id', req.match.user_id);
  if (error) throw new Error(error.message ?? 'update failed');
}

export function buildCoverLibraryInsert(userId: string, category: string, coverUrl: string) {
  return { table: 'user_intent_cover_library' as const, values: { user_id: userId, category, cover_url: coverUrl } };
}

export async function runCoverLibraryInsert(req: ReturnType<typeof buildCoverLibraryInsert>): Promise<CoverLibraryRow> {
  const { data, error } = await db().from(req.table).insert(req.values).select('id, category, cover_url').single();
  if (error) throw new Error(error.message ?? 'insert failed');
  return data as CoverLibraryRow;
}

/** Web `onLibraryRemove`: DELETE by id AND user id. */
export async function deleteCoverLibraryRow(id: string, userId: string): Promise<void> {
  const { error } = await db().from('user_intent_cover_library').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message ?? 'delete failed');
}
