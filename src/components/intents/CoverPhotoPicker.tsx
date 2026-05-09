/**
 * CoverPhotoPicker — single-shot landscape cover image selector
 * for the New Wish composer (and, later, the My Posts "Replace
 * cover" affordance).
 *
 * Single path: Upload a photo → file input → Supabase Storage
 * `avatars` bucket under a `{user_id}/intent-covers/{ts}.{ext}`
 * prefix (legacy path; the gateway-side AI generator writes to the
 * dedicated `intent-covers` bucket — migrating the per-post upload
 * path is a follow-up cleanup). The user_id must be the first path
 * segment to satisfy the avatars-bucket RLS policy
 * `auth.uid()::text = (storage.foldername(name))[1]`. Validation
 * lifted from the proven AvatarUploadField pattern.
 *
 * VTID-02806: the "✨ Generate for me" deterministic stock picker
 * was removed. Cover generation now happens server-side: the
 * gateway falls through library → universal → AI → curated when
 * `kind_payload.cover_url` is unset.
 *
 * Returns the chosen URL via `onChange`. Parent decides what to do
 * with it (post creation, intent patch, etc.).
 */

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { CoverTheme } from '@/lib/intentCovers';
import { processCoverImageTo16x9 } from '@/lib/coverImageTo16x9';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface CoverPhotoPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /**
   * Theme bucket — kept on the props for backward compatibility,
   * but no longer drives any client-side image selection. The
   * gateway derives its own theme from the intent's category when
   * it generates a cover server-side.
   */
  theme?: CoverTheme;
  /**
   * Stable seed kept on the props for backward compatibility.
   * No longer used now that the deterministic stock picker is gone.
   */
  seed?: string;
}

const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export function CoverPhotoPicker({
  value,
  onChange,
  // theme + seed are kept on the prop shape so callers don't break;
  // VTID-02806 made them no-ops since the gateway resolves the cover.
  theme: _theme = 'generic',
  seed: _seed,
}: CoverPhotoPickerProps) {
  const [uploading, setUploading] = useState(false);
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
      notifyError('toasts.intents.uploadFailed', 'toasts.intents.heicheifFormatNotSupportedByBrowsers');
      return;
    }

    if (!file.type.startsWith('image/') || !ALLOWED_EXTS.includes(fileExt)) {
      notifyError('toasts.intents.uploadFailed');
      return;
    }

    setUploading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error('Not authenticated');

      // VTID-02806h: normalise the upload to a 16:9 JPEG so the
      // resulting cover always fills the Find-a-Match tile cleanly.
      // Falls back to the raw bytes if conversion fails.
      let body: Blob;
      let contentType: string;
      let outExt: string;
      try {
        const processed = await processCoverImageTo16x9(file);
        body = processed.blob;
        contentType = processed.mime;
        outExt = processed.ext;
      } catch {
        const arrayBuffer = await file.arrayBuffer();
        body = new Blob([arrayBuffer], { type: file.type });
        contentType = file.type;
        outExt = fileExt;
      }
      const fileName = `${uid}/intent-covers/${Date.now()}.${outExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, body, { upsert: true, contentType });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      onChange(publicUrl);
      notify('toasts.intents.coverPhotoUploaded');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      notifyError('toasts.intents.uploadFailed');
    } finally {
      setUploading(false);
    }
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
          <img src={value} alt={t('screens.intents.coverPreview')} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Upload className="h-6 w-6" />
            <p className="text-xs">{t('screens.intents.addCoverPhoto')}</p>
          </div>
        )}
      </div>

      <div className="flex items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onUploadClick}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
          {value ? 'Replace photo' : 'Upload a photo'}
        </Button>
      </div>
    </div>
  );
}
