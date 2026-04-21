import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  language?: string;
}

interface ExtractedMetadata {
  durationSec: number;
  width: number;
  height: number;
  thumbnailUrl: string;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 5 * 60; // 5 minutes in seconds
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const EXTRACT_META_TIMEOUT_MS = 20_000;

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

  const extractServerMetadata = async (videoPath: string): Promise<ExtractedMetadata | null> => {
    try {
      const result = await Promise.race([
        supabase.functions.invoke('extract-video-meta', { body: { videoPath } }),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: new Error('extract-video-meta timed out') }),
            EXTRACT_META_TIMEOUT_MS,
          ),
        ),
      ]);

      if (result.error || !result.data) {
        console.error('extract-video-meta failed:', result.error);
        return null;
      }
      return result.data as ExtractedMetadata;
    } catch (err) {
      console.error('extract-video-meta invoke threw:', err);
      return null;
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
        // Server-side ffmpeg extraction. Fire-and-forget — UI shouldn't wait
        // for the round-trip, but we do invalidate once it lands.
        void extractServerMetadata(filePath).then(async (extracted) => {
          if (!extracted) return;
          const { error: patchError } = await supabase
            .from('media_videos')
            .update({
              thumbnail_url: extracted.thumbnailUrl,
              duration_sec: extracted.durationSec,
              width: extracted.width,
              height: extracted.height,
            })
            .eq('id', video.id);

          if (patchError) {
            console.error('Failed to patch media_videos with extracted metadata:', patchError);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['shorts'] });
        });
      }

      setProgress(100);

      toast({
        title: 'Upload successful!',
        description: customThumbnailUrl
          ? 'Your video has been published.'
          : 'Your video has been published — thumbnail will appear in a moment.',
      });

      return video;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { uploadVideo, isUploading, progress, validateVideo };
};
