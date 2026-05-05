import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  language?: string;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 5 * 60; // 5 minutes in seconds
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const EXTRACT_META_TIMEOUT_MS = 30_000;

// VITE_GATEWAY_URL in this repo already includes "/api/v1"; VITE_GATEWAY_BASE is bare origin.
// Mirror useAutoShortMetadata so we hit the same host.
const GATEWAY_BASE = (
  (import.meta.env.VITE_GATEWAY_BASE as string | undefined) ||
  ((import.meta.env.VITE_GATEWAY_URL as string | undefined) || '').replace(/\/api\/v1\/?$/, '') ||
  ''
).replace(/\/+$/, '');
const EXTRACT_THUMBNAIL_ENDPOINT = `${GATEWAY_BASE}/api/v1/media-hub/shorts/extract-thumbnail`;

export const useVideoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateVideo = async (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only MP4, WebM, and OGG videos are supported' };
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Video must be under 500MB' };
    }

    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION) {
        return { valid: false, error: 'Video must be 5 minutes or less' };
      }
      return { valid: true, duration };
    } catch (error) {
      console.error('Duration check error:', error);
      return { valid: true };
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
    });
  };

  const requestServerThumbnail = async (videoId: string, videoPath: string): Promise<boolean> => {
    try {
      const { data: sessionResult } = await supabase.auth.getSession();
      const token = sessionResult.session?.access_token;
      if (!token) {
        console.warn('extract-thumbnail skipped: no auth session');
        return false;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), EXTRACT_META_TIMEOUT_MS);
      try {
        const resp = await fetch(EXTRACT_THUMBNAIL_ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ video_id: videoId, video_path: videoPath }),
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          console.error(`extract-thumbnail failed: HTTP ${resp.status}`, body);
          return false;
        }
        return true;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.error('extract-thumbnail threw:', err);
      return false;
    }
  };

  const uploadVideo = async (file: File, metadata: UploadMetadata, options?: { thumbnailFile?: File }) => {
    try {
      setIsUploading(true);
      setProgress(0);

      const validation = await validateVideo(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      setProgress(10);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      setProgress(20);

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `shorts/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(50);

      const { data: { publicUrl: srcUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setProgress(60);

      // Custom thumbnail short-circuits the server extraction.
      let customThumbnailUrl: string | null = null;
      if (options?.thumbnailFile) {
        const thumbnailExt = options.thumbnailFile.name.split('.').pop() || 'jpg';
        const thumbnailPath = `shorts/${user.id}/${timestamp}_thumb.${thumbnailExt}`;

        const { error: thumbError } = await supabase.storage
          .from('media')
          .upload(thumbnailPath, options.thumbnailFile, {
            cacheControl: '3600',
            contentType: options.thumbnailFile.type || 'image/jpeg',
            upsert: false,
          });

        if (thumbError) {
          console.error('Custom thumbnail upload error:', thumbError);
        } else {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(thumbnailPath);
          customThumbnailUrl = thumbUrl;
        }
      }

      setProgress(75);

      // Insert the row immediately so the user lands on a published video.
      // Thumbnail/dimensions get patched in below from the Edge Function.
      const { data: video, error: dbError } = await supabase
        .from('media_videos')
        .insert({
          user_id: user.id,
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          category: metadata.category,
          language: metadata.language,
          src_url: srcUrl,
          thumbnail_url: customThumbnailUrl,
          duration_sec: validation.duration || null,
          width: null,
          height: null,
          status: 'published',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(90);

      if (!customThumbnailUrl) {
        // Server-side ffmpeg extraction on the gateway. The gateway patches
        // media_videos itself; we just invalidate the shorts query once it lands.
        void requestServerThumbnail(video.id, filePath).then((ok) => {
          if (ok) queryClient.invalidateQueries({ queryKey: ['shorts'] });
        });
      }

      setProgress(100);

      notify('toasts.hooks.uploadSuccessful');

      return video;
    } catch (error: any) {
      console.error('Upload error:', error);
      notifyError('toasts.hooks.uploadFailed');
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { uploadVideo, isUploading, progress, validateVideo };
};
