/**
 * CoverPhotoPicker — single-shot landscape cover image selector
 * for the New Wish composer (and, later, the My Posts "Replace
 * cover" affordance).
 *
 * Two paths to a cover URL, both visible at once so the user picks
 * whichever feels easiest:
 *
 *   • Upload a photo  → file input → Supabase Storage `avatars`
 *     bucket under an `intent-covers/{user_id}/{ts}.{ext}` prefix
 *     (re-uses the existing public bucket so this PR doesn't
 *     require new Supabase admin setup), validation lifted from
 *     the proven AvatarUploadField pattern.
 *
 *   • ✨ Generate for me → deterministic themed picker from
 *     `pickThemedCover(theme, seed)` — V1 fallback so users always
 *     have a presentable cover even before any AI image-gen
 *     backend exists. When the gateway exposes
 *     `POST /intents/cover/generate` later, this branch can call
 *     it transparently with no API change to the consumer.
 *
 * Returns the chosen URL via `onChange`. Parent decides what to do
 * with it (post creation, intent patch, etc.).
 */

import { useRef, useState } from 'react';
import { Loader2, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { pickThemedCover, type CoverTheme } from '@/lib/intentCovers';

interface CoverPhotoPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Drives the "✨ Generate for me" themed picker. */
  theme?: CoverTheme;
  /**
   * Stable string for the themed picker so the same intent gets the
   * same generated cover across renders. Pass intent_id once known;
   * before that a per-session uuid is fine.
   */
  seed?: string;
}

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export function CoverPhotoPicker({
  value,
  onChange,
  theme = 'generic',
  seed,
}: CoverPhotoPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onUploadClick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      fileExt === 'heic' ||
      fileExt === 'heif';

    if (isHeic) {
      toast({
        title: 'Upload failed',
        description:
          'HEIC/HEIF format is not supported by browsers. Please convert to JPG or PNG first.',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/') || !ALLOWED_EXTS.includes(fileExt)) {
      toast({
        title: 'Upload failed',
        description: `Unsupported image format (.${fileExt}). Please use JPG, PNG, GIF, or WebP.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error('Not authenticated');

      const fileName = `intent-covers/${uid}/${Date.now()}.${fileExt}`;
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      onChange(publicUrl);
      toast({ title: 'Cover photo uploaded' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const onGenerateClick = () => {
    setGenerating(true);
    // Tiny artificial delay so the spinner registers and the
    // interaction feels intentional. The picker itself is sync.
    window.setTimeout(() => {
      const url = pickThemedCover(theme, seed ?? `${theme}:${Date.now()}`);
      onChange(url);
      setGenerating(false);
      toast({ title: 'Themed cover ready', description: 'You can replace it any time.' });
    }, 350);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={onFileSelected}
      />

      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-border bg-muted">
        {value ? (
          <img src={value} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Upload className="h-6 w-6" />
            <p className="text-xs">Add a cover photo</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onUploadClick}
          disabled={uploading || generating}
          className="flex-1"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
          {value ? 'Replace photo' : 'Upload a photo'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onGenerateClick}
          disabled={uploading || generating}
          className="flex-1"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          ✨ Generate for me
        </Button>
      </div>
    </div>
  );
}
