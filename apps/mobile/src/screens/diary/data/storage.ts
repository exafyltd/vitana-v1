/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — Supabase Storage and the
 * backend speech-to-text, through the app's one Supabase client
 * (`auth/client.ts`). Native twins of:
 *
 *  - `PhotoDiaryUploader.tsx`: upload to the public `diary-photos` bucket as
 *    `<user id>/<ms>-<random>.<ext>`, then `getPublicUrl`;
 *  - `DiaryEntryList.tsx` handleDelete: remove the entry's `diary-photos` objects;
 *  - `UnifiedCaptureCard.tsx` handleSendFeedback: upload bug attachments to
 *    `feedback-attachments` and sign them for a year (31536000 s);
 *  - `diaryAudioRecorder.ts` transcribeAudioBlob: the `transcribe-audio` edge
 *    function with `{ audio: base64, language, mimeType }` → `{ transcript }`.
 */
import { getSupabase } from '../../../auth/client';
import { imageExtension, type PickedImage } from '../../../ports/diary-capture';

export const DIARY_PHOTOS_BUCKET = 'diary-photos';
export const FEEDBACK_ATTACHMENTS_BUCKET = 'feedback-attachments';

/** base64 → bytes (Hermes and node both have `atob`). */
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function objectName(userId: string, image: PickedImage): string {
  return `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${imageExtension(image)}`;
}

/** Uploads every photo to `diary-photos` and returns their public urls; the first failure throws (web). */
export async function uploadDiaryPhotos(userId: string, images: PickedImage[]): Promise<string[]> {
  const bucket = getSupabase().storage.from(DIARY_PHOTOS_BUCKET);
  const urls: string[] = [];
  for (const image of images) {
    const name = objectName(userId, image);
    const { error } = await bucket.upload(name, base64ToBytes(image.base64), { contentType: image.mimeType });
    if (error) throw new Error(error.message);
    urls.push(bucket.getPublicUrl(name).data.publicUrl);
  }
  return urls;
}

/** Removes the `diary-photos` objects behind an entry's public urls. */
export async function removeDiaryPhotos(urls: string[]): Promise<void> {
  const paths = urls.map((u) => /diary-photos\/(.+)$/.exec(u)?.[1]).filter((p): p is string => !!p);
  if (paths.length > 0) await getSupabase().storage.from(DIARY_PHOTOS_BUCKET).remove(paths);
}

/** Uploads bug-report screenshots to `feedback-attachments`; a failed one is skipped (web). Returns signed urls. */
export async function uploadFeedbackAttachments(userId: string, images: PickedImage[]): Promise<string[]> {
  const bucket = getSupabase().storage.from(FEEDBACK_ATTACHMENTS_BUCKET);
  const urls: string[] = [];
  for (const image of images) {
    const name = objectName(userId, image);
    const { error } = await bucket.upload(name, base64ToBytes(image.base64), { contentType: image.mimeType });
    if (error) continue;
    const { data } = await bucket.createSignedUrl(name, 31536000);
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  return urls;
}

/** The backend STT the web uses where Web Speech is unavailable (and the only one natively). */
export async function transcribeAudio(audioBase64: string, language: string, mimeType: string): Promise<string> {
  const { data, error } = await getSupabase().functions.invoke('transcribe-audio', { body: { audio: audioBase64, language, mimeType } });
  if (error) throw new Error(error.message || 'Transcription failed');
  const d = (data ?? {}) as { transcript?: unknown; error?: unknown; details?: unknown };
  if (d.error) throw new Error(`${String(d.error)}${d.details ? ` — ${String(d.details)}` : ''}`);
  return typeof d.transcript === 'string' ? d.transcript.trim() : '';
}
