/**
 * VTID-05677 — uploads, the native twins of web `useMediaUpload.ts` (music and
 * podcast) and `useVideoUpload.ts` (shorts):
 *  - music / podcast: size limit (50 / 100 MB), bucket `media-uploads`, path
 *    `<user>/<ts>_<safe name>`, `media_uploads` row (`status: 'pending'`,
 *    `is_public` from the visibility), then `music_metadata` or `podcast_metadata`
 *    (host / guests split on commas); a metadata failure deletes the upload row;
 *  - video: type / size (500 MB) / duration (5 min) checks, bucket `media`, path
 *    `shorts/<user>/<ts>_<safe name>`, optional custom thumbnail, `media_videos`
 *    row (`status: 'published'`); without a custom thumbnail the gateway
 *    `POST /media-hub/shorts/extract-thumbnail` is asked for one (best effort).
 */
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import type { AudioUploadInput, VideoUploadInput } from '../../../ports/media';
import { readFileBytes, safeFileName } from './storage';

export const AUDIO_SIZE_LIMITS = { music: 50 * 1024 * 1024, podcast: 100 * 1024 * 1024 } as const;
export const VIDEO_MAX_SIZE = 500 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SEC = 5 * 60;
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] as const;
const AUDIO_BUCKET = 'media-uploads';
const EXTRACT_THUMBNAIL_PATH = '/media-hub/shorts/extract-thumbnail';
const EXTRACT_META_TIMEOUT_MS = 30_000;

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) throw new Error('Authentication required');
  return user.id;
}

export async function uploadAudio(input: AudioUploadInput): Promise<void> {
  const supabase = getSupabase();
  const sizeLimit = AUDIO_SIZE_LIMITS[input.mediaType];
  if (input.file.size > sizeLimit) throw new Error(`File exceeds ${sizeLimit / 1024 / 1024}MB limit for ${input.mediaType}`);
  const userId = await requireUserId();
  const filePath = `${userId}/${Date.now()}_${safeFileName(input.file.name)}`;
  const bytes = await readFileBytes(input.file.uri);
  const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(filePath, bytes, { contentType: input.file.mimeType, cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  const {
    data: { publicUrl },
  } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(filePath);
  const { data: mediaUpload, error: dbError } = await supabase
    .from('media_uploads')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      media_type: input.mediaType,
      file_url: publicUrl,
      file_path: filePath,
      file_size: input.file.size,
      mime_type: input.file.mimeType,
      duration: null,
      tags: input.tags,
      status: 'pending',
      is_public: input.visibility.toLowerCase() === 'public',
    })
    .select()
    .single();
  if (dbError) throw dbError;
  if (input.mediaType === 'music' && mediaUpload) {
    const { error } = await supabase.from('music_metadata').insert({ media_id: mediaUpload.id, genre: input.genre || null, mood: input.mood || null });
    if (error) {
      await supabase.from('media_uploads').delete().eq('id', mediaUpload.id);
      throw new Error('Failed to save music metadata. Please try again.');
    }
  } else if (input.mediaType === 'podcast' && mediaUpload) {
    const [host, ...guests] = (input.hostGuest || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from('podcast_metadata').insert({
      media_id: mediaUpload.id,
      host_name: host || null,
      guest_name: guests.length > 0 ? guests.join(', ') : null,
      language: input.language || null,
    });
    if (error) {
      await supabase.from('media_uploads').delete().eq('id', mediaUpload.id);
      throw new Error('Failed to save podcast metadata. Please try again.');
    }
  }
}

/** Web `validateVideo` (`useVideoUpload.ts`): type, size and (when known) duration. */
export function validateVideo(file: { mimeType: string; size: number }, durationSec?: number): { valid: true } | { valid: false; reason: 'type' | 'size' | 'duration' } {
  if (!(VIDEO_ALLOWED_TYPES as readonly string[]).includes(file.mimeType)) return { valid: false, reason: 'type' };
  if (file.size > VIDEO_MAX_SIZE) return { valid: false, reason: 'size' };
  if (durationSec != null && durationSec > VIDEO_MAX_DURATION_SEC) return { valid: false, reason: 'duration' };
  return { valid: true };
}

async function requestServerThumbnail(videoId: string, videoPath: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EXTRACT_META_TIMEOUT_MS);
    try {
      const resp = await getGateway()(EXTRACT_THUMBNAIL_PATH, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, video_path: videoPath }),
      });
      return resp.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error('extract-thumbnail threw:', err);
    return false;
  }
}

export async function uploadVideo(input: VideoUploadInput, onThumbnailReady?: () => void): Promise<void> {
  const supabase = getSupabase();
  const check = validateVideo(input.file, input.durationSec);
  if (!check.valid) throw new Error(`Invalid video: ${check.reason}`);
  const userId = await requireUserId();
  const timestamp = Date.now();
  const filePath = `shorts/${userId}/${timestamp}_${safeFileName(input.file.name)}`;
  const { error: uploadError } = await supabase.storage.from('media').upload(filePath, await readFileBytes(input.file.uri), {
    cacheControl: '3600',
    contentType: input.file.mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const {
    data: { publicUrl: srcUrl },
  } = supabase.storage.from('media').getPublicUrl(filePath);

  let customThumbnailUrl: string | null = null;
  if (input.thumbnail) {
    const ext = input.thumbnail.name.split('.').pop() || 'jpg';
    const thumbnailPath = `shorts/${userId}/${timestamp}_thumb.${ext}`;
    const { error: thumbError } = await supabase.storage.from('media').upload(thumbnailPath, await readFileBytes(input.thumbnail.uri), {
      cacheControl: '3600',
      contentType: input.thumbnail.mimeType || 'image/jpeg',
      upsert: false,
    });
    if (thumbError) {
      console.error('Custom thumbnail upload error:', thumbError);
    } else {
      customThumbnailUrl = supabase.storage.from('media').getPublicUrl(thumbnailPath).data.publicUrl;
    }
  }

  const { data: video, error: dbError } = await supabase
    .from('media_videos')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      tags: input.tags,
      category: input.category,
      language: input.language,
      src_url: srcUrl,
      thumbnail_url: customThumbnailUrl,
      duration_sec: input.durationSec || null,
      width: null,
      height: null,
      status: 'published',
    })
    .select()
    .single();
  if (dbError) throw dbError;

  if (!customThumbnailUrl && video) {
    void requestServerThumbnail(video.id, filePath).then((ok) => {
      if (ok) onThumbnailReady?.();
    });
  }
}
