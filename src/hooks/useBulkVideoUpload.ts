import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

export interface VideoFileItem {
  id: string;
  file: File;
  title: string;
  description: string;
  tags: string[];
  topic: string;
  visibility: 'public' | 'unlisted' | 'private';
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'failed';
  progress: number;
  error?: string;
  duration?: number;
  thumbnail?: {
    type: 'auto' | 'custom' | 'frame';
    url?: string;
    file?: File;
    selectedFrame?: number;
  };
  mediaId?: string;
  hasGenericTitle?: boolean;
}

interface UploadOptions {
  maxConcurrent?: number;
  onItemUpdate?: (item: VideoFileItem) => void;
}

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 300; // 5 minutes (300 seconds) for shorts, configurable

// Humanize filename: remove extension, replace _ and - with spaces, title case
const humanizeFilename = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace _ and - with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Check if title is generic (e.g., "Download", "Video", etc.)
const isGenericTitle = (title: string): boolean => {
  const genericTerms = ['download', 'video', 'file', 'clip', 'short', 'untitled', 'movie', 'vid'];
  const normalized = title.toLowerCase().trim();
  
  // Check if title is exactly a generic term or generic term with number
  return genericTerms.some(term => 
    normalized === term || 
    normalized.match(new RegExp(`^${term}\\s*\\(?\\d*\\)?$`))
  );
};

export const useBulkVideoUpload = () => {
  const [items, setItems] = useState<VideoFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploads, setActiveUploads] = useState(0);
  const { toast } = useToast();

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const generateAutoThumbnails = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const thumbnails: string[] = [];

      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const positions = [0.2, 0.5, 0.8]; // 20%, 50%, 80%
        let captured = 0;

        video.onseeked = () => {
          if (ctx && video.readyState >= 2) {
            // Use actual video dimensions for sharp thumbnails
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw video frame at full quality
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            thumbnails.push(canvas.toDataURL('image/jpeg', 0.9));
          }
          captured++;
          
          if (captured < positions.length) {
            video.currentTime = duration * positions[captured];
          } else {
            window.URL.revokeObjectURL(video.src);
            resolve(thumbnails);
          }
        };

        video.currentTime = duration * positions[0];
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve([]);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const captureThumbnailAtTime = (file: File, timeInSeconds: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(timeInSeconds, video.duration);
      };

      video.onseeked = () => {
        if (ctx && video.readyState >= 2) {
          // Use actual video dimensions instead of fixed size
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame at full quality
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          window.URL.revokeObjectURL(video.src);
          resolve(dataUrl);
        } else {
          window.URL.revokeObjectURL(video.src);
          reject(new Error('Failed to capture frame'));
        }
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only MP4, WebM, and OGG are supported.' };
    }

    // Check file size
    if (file.size > MAX_SIZE) {
      return { valid: false, error: `File exceeds 500MB limit` };
    }

    return { valid: true };
  };

  const addFiles = useCallback(async (files: File[], sharedMetadata?: Partial<VideoFileItem>) => {
    const newItems: VideoFileItem[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      const humanizedTitle = humanizeFilename(file.name);
      
      const item: VideoFileItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        title: sharedMetadata?.title || humanizedTitle,
        description: sharedMetadata?.description || '',
        tags: sharedMetadata?.tags || [],
        topic: sharedMetadata?.topic || 'General',
        visibility: sharedMetadata?.visibility || 'public',
        status: validation.valid ? 'queued' : 'failed',
        progress: 0,
        error: validation.error,
        hasGenericTitle: !sharedMetadata?.title && isGenericTitle(humanizedTitle),
      };

      // Get duration and generate thumbnails for valid files
      if (validation.valid) {
        try {
          const duration = await getVideoDuration(file);
          item.duration = duration;

          // Check duration for shorts
          if (duration > MAX_DURATION) {
            item.error = `Video is ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}. Shorts should be ≤5min. Consider uploading as full video.`;
          }

          // Generate auto thumbnails
          const autoThumbnails = await generateAutoThumbnails(file);
          if (autoThumbnails.length > 0) {
            item.thumbnail = {
              type: 'auto',
              url: autoThumbnails[1], // Use middle frame by default
            };
          }
        } catch (error) {
          console.error('Error processing video:', error);
        }
      }

      newItems.push(item);
    }

    setItems(prev => [...prev, ...newItems]);
    return newItems;
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<VideoFileItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const uploadItem = async (item: VideoFileItem): Promise<void> => {
    try {
      updateItem(item.id, { status: 'uploading', progress: 0 });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Upload video file
      const timestamp = Date.now();
      const fileExt = item.file.name.split('.').pop();
      const videoPath = `shorts/${user.id}/${timestamp}_${item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      updateItem(item.id, { progress: 20 });

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(videoPath, item.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      updateItem(item.id, { progress: 50 });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(videoPath);

      // Handle thumbnail upload
      let thumbnailUrl: string | null = null;
      
      if (item.thumbnail) {
        if (item.thumbnail.type === 'custom' && item.thumbnail.file) {
          // Upload custom thumbnail
          const thumbPath = `shorts/${user.id}/${timestamp}_thumb.jpg`;
          const { error: thumbError } = await supabase.storage
            .from('media')
            .upload(thumbPath, item.thumbnail.file);

          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(thumbPath);
            thumbnailUrl = thumbUrl;
          }
        } else if (item.thumbnail.url) {
          // Convert data URL to blob and upload
          const response = await fetch(item.thumbnail.url);
          const blob = await response.blob();
          const thumbPath = `shorts/${user.id}/${timestamp}_thumb.jpg`;
          
          const { error: thumbError } = await supabase.storage
            .from('media')
            .upload(thumbPath, blob, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: false
            });

          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(thumbPath);
            thumbnailUrl = thumbUrl;
          }
        }
      }

      updateItem(item.id, { progress: 70 });

      // Insert into database
      const { data: videoData, error: dbError } = await supabase
        .from('media_videos')
        .insert({
          user_id: user.id,
          title: item.title,
          description: item.description || null,
          src_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          duration_sec: item.duration || null,
          tags: item.tags,
          category: item.topic,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateItem(item.id, { 
        status: 'done', 
        progress: 100,
        mediaId: videoData.id 
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      updateItem(item.id, { 
        status: 'failed', 
        error: error.message || 'Upload failed',
        progress: 0 
      });
      throw error;
    }
  };

  const uploadAll = useCallback(async (maxConcurrent: number = 3) => {
    setIsUploading(true);
    const queuedItems = items.filter(item => item.status === 'queued');
    
    if (queuedItems.length === 0) {
      setIsUploading(false);
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    let currentIndex = 0;
    const uploading = new Set<Promise<void>>();

    const uploadNext = async () => {
      if (currentIndex >= queuedItems.length) return;

      const item = queuedItems[currentIndex];
      currentIndex++;

      try {
        await uploadItem(item);
        successCount++;
      } catch (error) {
        failureCount++;
      } finally {
        setActiveUploads(prev => prev - 1);
      }
    };

    // Start initial concurrent uploads
    for (let i = 0; i < Math.min(maxConcurrent, queuedItems.length); i++) {
      setActiveUploads(prev => prev + 1);
      uploading.add(uploadNext());
    }

    // Continue with remaining items
    while (currentIndex < queuedItems.length) {
      await Promise.race(uploading);
      if (currentIndex < queuedItems.length) {
        setActiveUploads(prev => prev + 1);
        uploading.add(uploadNext());
      }
    }

    // Wait for all to complete
    await Promise.all(uploading);

    setIsUploading(false);
    setActiveUploads(0);

    // Show summary toast
    notify('toasts.hooks.uploadComplete');
  }, [items, toast]);

  const retryItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    updateItem(id, { status: 'queued', error: undefined, progress: 0 });
    
    try {
      await uploadItem(item);
    } catch (error) {
      // Error already handled in uploadItem
    }
  }, [items]);

  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(item => item.status !== 'done'));
  }, []);

  return {
    items,
    isUploading,
    activeUploads,
    addFiles,
    updateItem,
    removeItem,
    uploadAll,
    retryItem,
    clearCompleted,
    captureThumbnailAtTime,
    generateAutoThumbnails,
  };
};
