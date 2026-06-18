import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, ImagePlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfilePosts } from '@/hooks/useProfilePosts';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notifyError, t } from '@/lib/i18n-toast';

interface MobileCreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_CHARS = 500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB — matches the media-uploads bucket limit

type MediaKind = 'image' | 'video';

export function MobileCreatePostSheet({ open, onOpenChange }: MobileCreatePostSheetProps) {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { translate } = useTranslation();
  const { createPost } = useProfilePosts();

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      notifyError('toasts.profile.onlyImagesOrVideosAllowed');
      return;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      notifyError('toasts.profile.imageMustUnder10mb');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      notifyError('toasts.profile.videoMustUnder50mb');
      return;
    }

    // Materialize into memory immediately to prevent Android file descriptor issues
    try {
      const buffer = await file.arrayBuffer();
      const materializedFile = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
      console.log('[PostUpload] File materialized:', materializedFile.size, materializedFile.type);
      // Revoke any previous preview before replacing it
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      setMediaFile(materializedFile);
      setMediaPreview(URL.createObjectURL(materializedFile));
      setMediaKind(isVideo ? 'video' : 'image');
    } catch (err) {
      console.error('[PostUpload] Failed to read file:', err);
      notifyError('toasts.profile.couldNotReadSelectedFile');
    }
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile) return;
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      if (mediaFile) {
        console.log('[PostUpload] auth check...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = mediaFile.name.split('.').pop();
        const path = `${user.id}/posts/${Date.now()}.${fileExt}`;

        console.log('[PostUpload] uploading...', { size: mediaFile.size, type: mediaFile.type, path, kind: mediaKind });
        const { error: uploadError } = await supabase.storage
          .from('media-uploads')
          .upload(path, mediaFile, { contentType: mediaFile.type, upsert: false });
        if (uploadError) {
          console.error('[PostUpload] upload failed:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('[PostUpload] getting public URL...');
        const { data: { publicUrl } } = supabase.storage.from('media-uploads').getPublicUrl(path);
        if (mediaKind === 'video') {
          videoUrl = publicUrl;
        } else {
          imageUrl = publicUrl;
        }
        console.log('[PostUpload] mediaUrl:', publicUrl, 'kind:', mediaKind);
      }
      console.log('[PostUpload] inserting post...');
      await createPost.mutateAsync({ content: content.trim(), imageUrl, videoUrl });
      toast({ title: translate('profilePosts.posted', 'Posted!') });
      cleanup();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[PostUpload] error:', err);
      toast({ title: translate('profilePosts.error', 'Something went wrong'), description: err?.message || '', variant: 'destructive' });
    }
  };

  const cleanup = () => {
    setContent('');
    removeMedia();
  };

  const handleClose = () => {
    cleanup();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col [&>button.absolute]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>{translate('profilePosts.createPost', 'Create Post')}</SheetTitle>
          <SheetDescription>{translate('profilePosts.placeholder', "What's on your mind?")}</SheetDescription>
        </SheetHeader>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold">{translate('profilePosts.createPost', 'Create Post')}</h2>
          <Button
            size="sm"
            disabled={(!content.trim() && !mediaFile) || content.length > MAX_CHARS || createPost.isPending}
            onClick={handlePost}
            className="rounded-full"
          >
            {createPost.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                {translate('profilePosts.post', 'Post')}
              </>
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={translate('profilePosts.placeholder', "What's on your mind?")}
            className="min-h-[200px] border-0 resize-none text-base focus-visible:ring-0 bg-transparent p-0"
            autoFocus
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border">
              {mediaKind === 'video' ? (
                <video src={mediaPreview} controls playsInline className="w-full max-h-[300px] bg-black" />
              ) : (
                <img src={mediaPreview} alt={t('screens.profile.preview')} className="w-full max-h-[300px] object-cover" />
              )}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={removeMedia}
                aria-label={t('screens.profile.removeMedia')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMediaSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 gap-1.5 px-4"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-sm font-medium">{t('screens.profile.fotoVideo')}</span>
          </Button>
          <span className={`text-sm ${content.length > MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
