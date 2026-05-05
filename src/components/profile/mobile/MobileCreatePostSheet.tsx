import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, ImagePlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfilePosts } from '@/hooks/useProfilePosts';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notifyError } from '@/lib/i18n-toast';

interface MobileCreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_CHARS = 500;

export function MobileCreatePostSheet({ open, onOpenChange }: MobileCreatePostSheetProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { translate } = useTranslation();
  const { createPost } = useProfilePosts();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
      notifyError('toasts.profile.onlyImagesAllowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notifyError('toasts.profile.imageMustUnder10mb');
      return;
    }
    // Materialize into memory immediately to prevent Android file descriptor issues
    try {
      const buffer = await file.arrayBuffer();
      const materializedFile = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
      console.log('[PostUpload] File materialized:', materializedFile.size, materializedFile.type);
      setImageFile(materializedFile);
      setImagePreview(URL.createObjectURL(materializedFile));
    } catch (err) {
      console.error('[PostUpload] Failed to read file:', err);
      notifyError('toasts.profile.couldNotReadSelectedImage');
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) return;
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        console.log('[PostUpload] auth check...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileExt = imageFile.name.split('.').pop();
        const path = `${user.id}/posts/${Date.now()}.${fileExt}`;

        console.log('[PostUpload] uploading...', { size: imageFile.size, type: imageFile.type, path });
        const { error: uploadError } = await supabase.storage
          .from('media-uploads')
          .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        if (uploadError) {
          console.error('[PostUpload] upload failed:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('[PostUpload] getting public URL...');
        const { data: { publicUrl } } = supabase.storage.from('media-uploads').getPublicUrl(path);
        imageUrl = publicUrl;
        console.log('[PostUpload] imageUrl:', imageUrl);
      }
      console.log('[PostUpload] inserting post...');
      await createPost.mutateAsync({ content: content.trim(), imageUrl });
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
    removeImage();
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
            disabled={(!content.trim() && !imageFile) || content.length > MAX_CHARS || createPost.isPending}
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

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border">
              <img src={imagePreview} alt="Preview" className="w-full max-h-[300px] object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={removeImage}
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
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 gap-1.5 px-4"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-sm font-medium">Foto / Video</span>
          </Button>
          <span className={`text-sm ${content.length > MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
