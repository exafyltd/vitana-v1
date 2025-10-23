import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  language?: string;
}

interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
  thumbnailUrl: string;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 5 * 60; // 5 minutes in seconds
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

export const useVideoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const validateVideo = async (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only MP4, WebM, and OGG videos are supported' };
    }

    // Check file size
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Video must be under 500MB' };
    }

    // Check duration
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_DURATION) {
        return { valid: false, error: 'Video must be 5 minutes or less' };
      }
      return { valid: true, duration };
    } catch (error) {
      console.error('Duration check error:', error);
      return { valid: true }; // Proceed even if duration check fails
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

  const generateThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of duration, whichever is earlier
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            window.URL.revokeObjectURL(video.src);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          window.URL.revokeObjectURL(video.src);
          reject(error);
        }
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for thumbnail'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const uploadVideo = async (file: File, metadata: UploadMetadata, options?: { thumbnailFile?: File }) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // Validate video
      const validation = await validateVideo(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      setProgress(10);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      setProgress(20);

      // Generate file path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = `shorts/${user.id}/${fileName}`;

      // Upload video to storage with proper contentType
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProgress(50);

      // Get public URL
      const { data: { publicUrl: srcUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setProgress(60);

      // Generate or upload thumbnail
      console.log('Processing thumbnail...');
      let thumbnailUrl: string | null = null;
      try {
        if (options?.thumbnailFile) {
          // Use custom thumbnail provided by user
          const thumbnailExt = options.thumbnailFile.name.split('.').pop() || 'jpg';
          const thumbnailPath = `shorts/${user.id}/${timestamp}_thumb.${thumbnailExt}`;
          
          const { error: thumbError } = await supabase.storage
            .from('media')
            .upload(thumbnailPath, options.thumbnailFile, {
              cacheControl: '3600',
              contentType: options.thumbnailFile.type || 'image/jpeg',
              upsert: false
            });

          if (thumbError) {
            console.error('Custom thumbnail upload error:', thumbError);
          } else {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbUrl;
          }
        } else {
          // Generate thumbnail automatically from video
          const thumbnailBlob = await generateThumbnail(file);
          const thumbnailPath = `shorts/${user.id}/${timestamp}_thumb.jpg`;
          
          const { error: thumbError } = await supabase.storage
            .from('media')
            .upload(thumbnailPath, thumbnailBlob, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: false
            });

          if (thumbError) {
            console.error('Thumbnail upload error:', thumbError);
          } else {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbUrl;
          }
        }
      } catch (thumbError) {
        console.error('Thumbnail processing error:', thumbError);
      }

      setProgress(80);

      // Insert into database
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
          thumbnail_url: thumbnailUrl,
          duration_sec: validation.duration || null,
          width: null,
          height: null,
          status: 'published'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);

      toast({
        title: 'Upload successful!',
        description: 'Your video has been published.',
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
