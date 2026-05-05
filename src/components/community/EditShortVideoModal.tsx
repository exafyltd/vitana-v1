import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface EditShortVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    tags?: string[];
    src_url: string;
    thumbnail_url?: string;
  };
  onSave: () => void;
}

export function EditShortVideoModal({ isOpen, onClose, video, onSave }: EditShortVideoModalProps) {
  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [tags, setTags] = useState<string[]>(video.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [captureTime, setCaptureTime] = useState(50); // percentage
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset form when video changes
  useEffect(() => {
    if (isOpen) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setTags(video.tags || []);
      setTagInput('');
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
  }, [isOpen, video]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const captureThumbnailFromVideo = async () => {
    setIsRegenerating(true);
    try {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.preload = 'metadata';
      
      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          const timeInSeconds = (captureTime / 100) * videoElement.duration;
          videoElement.currentTime = Math.min(timeInSeconds, videoElement.duration);
        };
        
        videoElement.onseeked = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (ctx && videoElement.readyState >= 2) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
              
              canvas.toBlob((blob) => {
                if (blob) {
                  const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                  setThumbnailFile(file);
                  setThumbnailPreview(canvas.toDataURL('image/jpeg', 0.9));
                  resolve(true);
                } else {
                  reject(new Error('Failed to create thumbnail'));
                }
              }, 'image/jpeg', 0.9);
            } else {
              reject(new Error('Video not ready'));
            }
          } catch (err) {
            reject(err);
          }
        };
        
        videoElement.onerror = () => reject(new Error('Failed to load video'));
        videoElement.src = video.src_url;
      });
      
      notify('toasts.community.thumbnailCaptured', 'toasts.community.previewNewThumbnailBelow');
    } catch (error) {
      console.error('Thumbnail capture error:', error);
      notifyError('toasts.community.captureFailed', 'toasts.community.couldNotCaptureThumbnailFromVideo');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      notifyError('toasts.community.validationError', 'toasts.community.titleRequired');
      return;
    }

    setIsSaving(true);
    try {
      let thumbnailUrl = video.thumbnail_url;

      // Upload new thumbnail if provided
      if (thumbnailFile) {
        const fileExt = 'jpg';
        const fileName = `${video.user_id}/${video.id}-thumb-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, thumbnailFile, {
            cacheControl: '3600',
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        
        thumbnailUrl = publicUrl;
      }

      // Update video metadata
      const { error: updateError } = await supabase
        .from('media_videos')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          tags: tags.length > 0 ? tags : null,
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id)
        .eq('user_id', video.user_id);

      if (updateError) throw updateError;

      notify('toasts.community.success', 'toasts.community.videoUpdatedSuccessfully');

      onSave();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      notifyError('toasts.community.error', 'toasts.community.failedUpdateVideoPleaseTryAgain');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.community.editVideoDetails')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('screens.community.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('screens.community.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('screens.community.tagsMax5')}</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type tag and press Enter"
                disabled={tags.length >= 5}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                variant="outline"
              >
                {t('screens.community.add')}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail Update */}
          <div className="space-y-3 pt-4 border-t">
            <Label>{t('screens.community.updateThumbnail')}</Label>
            
            {/* Current or preview thumbnail */}
            <div className="relative aspect-video w-full max-w-xs rounded-lg overflow-hidden bg-muted">
              <img
                src={thumbnailPreview || video.thumbnail_url || ''}
                alt={t('screens.community.thumbnailPreview')}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Upload custom image */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving || isRegenerating}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>

            {/* Regenerate from video */}
            <div className="space-y-2">
              <Label htmlFor="captureTime">Or capture from video at {captureTime}%</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="captureTime"
                  type="range"
                  min="10"
                  max="90"
                  step="10"
                  value={captureTime}
                  onChange={(e) => setCaptureTime(parseInt(e.target.value))}
                  className="flex-1"
                  disabled={isSaving || isRegenerating}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={captureThumbnailFromVideo}
                  disabled={isSaving || isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t('screens.community.capture')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('screens.community.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
