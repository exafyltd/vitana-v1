import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadMetadata {
  title: string;
  description: string;
  mediaType: 'music' | 'podcast' | 'video';
  tags: string[];
  visibility: string;
  language?: string;
  genre?: string;
  mood?: string;
  hostGuest?: string;
  duration?: number;
  topic?: string;
  thumbnailUrl?: string;
}

const BUCKET_MAP = {
  music: 'media-uploads',
  podcast: 'media-uploads',
  video: 'media-uploads',
} as const;

const SIZE_LIMITS = {
  music: 50 * 1024 * 1024, // 50MB
  podcast: 100 * 1024 * 1024, // 100MB
  video: 50 * 1024 * 1024, // 50MB
} as const;

export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const extractDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const mediaElement = file.type.startsWith('audio/') 
        ? new Audio() 
        : document.createElement('video');
      
      mediaElement.preload = 'metadata';
      mediaElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(mediaElement.src);
        resolve(Math.floor(mediaElement.duration));
      };
      mediaElement.onerror = () => resolve(0);
      mediaElement.src = URL.createObjectURL(file);
    });
  };

  const uploadMedia = async (file: File, metadata: UploadMetadata) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // Validate file size
      const sizeLimit = SIZE_LIMITS[metadata.mediaType];
      if (file.size > sizeLimit) {
        throw new Error(`File exceeds ${sizeLimit / 1024 / 1024}MB limit for ${metadata.mediaType}`);
      }

      console.log('[MediaUpload] Starting upload:', { mediaType: metadata.mediaType, fileType: file.type, fileSize: file.size });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      setProgress(20);

      // Extract duration if not provided
      let duration = metadata.duration;
      if (!duration && (metadata.mediaType === 'music' || metadata.mediaType === 'podcast')) {
        duration = await extractDuration(file);
      }

      setProgress(30);

      // Generate unique file path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Upload to storage
      const bucket = BUCKET_MAP[metadata.mediaType];
      console.log('[MediaUpload] Uploading to storage:', { bucket, filePath, contentType: file.type, size: file.size });
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProgress(60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(70);

      // Insert into media_uploads table
      const { data: mediaUpload, error: dbError } = await supabase
        .from('media_uploads')
        .insert({
          user_id: user.id,
          title: metadata.title,
          description: metadata.description,
          media_type: metadata.mediaType,
          file_url: publicUrl,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          duration: duration || null,
          tags: metadata.tags,
          status: 'pending',
          is_public: metadata.visibility.toLowerCase() === 'public',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(80);

      // Insert type-specific metadata
      if (metadata.mediaType === 'music' && mediaUpload) {
        const { error: musicError } = await supabase.from('music_metadata').insert({
          media_id: mediaUpload.id,
          genre: metadata.genre || null,
          mood: metadata.mood || null,
        });
        
        if (musicError) {
          await supabase.from('media_uploads').delete().eq('id', mediaUpload.id);
          throw new Error('Failed to save music metadata. Please try again.');
        }
      } else if (metadata.mediaType === 'podcast' && mediaUpload) {
        const [host, ...guests] = (metadata.hostGuest || '').split(',').map(s => s.trim()).filter(Boolean);
        const guestCombined = guests.length > 0 ? guests.join(', ') : null;
        
        const { error: podcastError } = await supabase.from('podcast_metadata').insert({
          media_id: mediaUpload.id,
          host_name: host || null,
          guest_name: guestCombined,
          language: metadata.language || null,
        });
        
        if (podcastError) {
          await supabase.from('media_uploads').delete().eq('id', mediaUpload.id);
          throw new Error('Failed to save podcast metadata. Please try again.');
        }
      } else if (metadata.mediaType === 'video' && mediaUpload) {
        console.log('[MediaUpload] Inserting video metadata for:', mediaUpload.id);
        const { error: videoError } = await supabase.from('video_metadata').insert({
          media_id: mediaUpload.id,
          topic: metadata.topic || null,
        });
        
        if (videoError) {
          await supabase.from('media_uploads').delete().eq('id', mediaUpload.id);
          throw new Error('Failed to save video metadata. Please try again.');
        }
      }

      setProgress(100);

      toast({
        title: 'Upload successful!',
        description: 'Your media is pending moderation.',
      });

      return mediaUpload;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return { uploadMedia, isUploading, progress };
};
