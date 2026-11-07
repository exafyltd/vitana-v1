/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — chat
 * attachments in the private `chat-attachments` bucket, native twin of web
 * `src/lib/fileUpload.ts` (class B, Supabase client):
 *
 *  - uploadChatAttachment: path `{me}/{threadId}/{ts}_{rand}.{ext}`, a signed
 *    upload URL (`createSignedUploadUrl`), the file PUT with progress through
 *    the device port, then a fresh signed read URL — the same steps, the same
 *    50 MB limit;
 *  - uploadVoiceMessage: `voice_{ts}_{rand}.{ext}` under `{me}/draft/`
 *    (the web passes no thread id for voice);
 *  - deleteChatAttachment (an uploaded file that is removed before sending);
 *  - copyChatAttachmentForThread (a forward copies into `{me}/{target}/…`);
 *  - getSignedAttachmentUrl (1 h unless asked otherwise);
 *  - validateFile / formatFileSize / attachment kinds (image / video / file).
 */
import { getSupabase } from '../../../auth/client';
import { config, requireValue } from '../../../config/env';
import { getChatDevice, type PickedFile, type UploadProgress } from '../../../ports/chat-device';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const BUCKET = 'chat-attachments';

export interface AttachmentData {
  type: 'image' | 'file' | 'voice' | 'video' | 'audio';
  url: string;
  path?: string;
  filename?: string;
  name: string;
  size: number;
  mime?: string;
  duration?: number;
}

export interface FileUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
  name: string;
}

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
]);

/** web validateFile: ≤ 50 MB and a known type. */
export function validateFile(file: Pick<PickedFile, 'size' | 'mimeType'>): boolean {
  if (file.size > MAX_UPLOAD_BYTES) return false;
  return ALLOWED.has(file.mimeType) || file.mimeType.startsWith('text/');
}

/** web formatFileSize. */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/** The attachment kind the composer stores (MessageInput.tsx uploadOne, VTID-05316). */
export function attachmentKind(mime: string, name: string): 'image' | 'video' | 'file' {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
  if (m.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  return 'file';
}

function randomId(): string {
  return Math.random().toString(36).substring(2);
}

export async function getSignedAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}

function publishableKey(): string | null {
  try {
    return requireValue(config, 'supabasePublishableKey');
  } catch {
    return null;
  }
}

export async function uploadChatAttachment(file: PickedFile, onProgress: ((p: UploadProgress) => void) | undefined, threadId: string | undefined): Promise<FileUploadResult> {
  const supabase = getSupabase();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) throw new Error('User must be authenticated to upload files');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('File size exceeds 50MB limit');
  const ext = file.name.split('.').pop() || '';
  const filePath = `${user.id}/${threadId || 'draft'}/${Date.now()}_${randomId()}.${ext}`;
  const bucket = supabase.storage.from(BUCKET);
  const { data: signed, error: signError } = await bucket.createSignedUploadUrl(filePath);
  if (signError || !signed?.signedUrl) throw signError ?? new Error('Failed to create an upload URL');
  const key = publishableKey();
  await getChatDevice().putFile(signed.signedUrl, file, { 'x-upsert': 'false', ...(key ? { apikey: key } : {}) }, onProgress);
  const storedPath = signed.path || filePath;
  const url = await getSignedAttachmentUrl(storedPath);
  if (!url) throw new Error('Failed to generate signed URL for uploaded file');
  onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
  return { url, path: storedPath, size: file.size, type: file.mimeType, name: file.name };
}

export async function uploadVoiceMessage(recording: { uri: string; mimeType: string }, duration: number): Promise<FileUploadResult & { duration: number }> {
  const ext = recording.mimeType === 'audio/mp4' ? 'm4a' : recording.mimeType.split('/')[1] || 'm4a';
  const file: PickedFile = { uri: recording.uri, name: `voice_${Date.now()}_${randomId()}.${ext}`, mimeType: recording.mimeType, size: 0 };
  const result = await uploadChatAttachment(file, undefined, undefined);
  return { ...result, duration };
}

export async function deleteChatAttachment(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function copyChatAttachmentForThread(sourcePath: string, userId: string, targetThreadId: string): Promise<{ path: string; url: string }> {
  const last = sourcePath.split('/').pop() || '';
  const ext = last.includes('.') ? last.split('.').pop() || '' : '';
  const destPath = `${userId}/${targetThreadId}/${Date.now()}_${randomId()}${ext ? `.${ext}` : ''}`;
  const { error } = await getSupabase().storage.from(BUCKET).copy(sourcePath, destPath);
  if (error) throw error;
  const url = await getSignedAttachmentUrl(destPath);
  if (!url) throw new Error('Failed to generate signed URL for copied attachment');
  return { path: destPath, url };
}
