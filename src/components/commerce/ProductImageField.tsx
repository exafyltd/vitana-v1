/**
 * Product photo upload (VTID-03894).
 *
 * Follows the house idiom from `profile/editor/AvatarUploadField.tsx` verbatim
 * — arrayBuffer -> Blob before upload, because handing the File straight to
 * supabase-js is what made uploads fail on iOS Safari there.
 *
 * Bucket: the shared public `media-uploads` under a `commerce-products/`
 * prefix, rather than a dedicated bucket. A `product-images` bucket would be
 * tidier, but provisioning one is a live-Supabase action this change cannot
 * take, and blocking the whole form on it would be the wrong trade.
 */
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { t, notifyError } from '@/lib/i18n-toast';

const BUCKET = 'media-uploads';
const PREFIX = 'commerce-products';
const MAX_BYTES = 8 * 1024 * 1024;

export function ProductImageField({
  images,
  onChange,
  userId,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  userId: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File) => {
    // HEIC/HEIF is rejected for the same reason AvatarUploadField rejects it:
    // it uploads fine and then renders nowhere outside Safari.
    if (/hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
      notifyError('screens.commerceportal.productForm.imageHeic');
      return;
    }
    if (!file.type.startsWith('image/')) {
      notifyError('screens.commerceportal.productForm.imageNotAnImage');
      return;
    }
    if (file.size > MAX_BYTES) {
      notifyError('screens.commerceportal.productForm.imageTooLarge');
      return;
    }

    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${PREFIX}/${userId}/${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: file.type });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange([...images, publicUrl]);
    } catch {
      notifyError('screens.commerceportal.productForm.imageFailed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt=""
              className="h-20 w-20 rounded-xl border border-slate-700 object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter((u) => u !== url))}
              aria-label={t('screens.commerceportal.productForm.imageRemove')}
              className="absolute -end-1.5 -top-1.5 rounded-full border border-slate-700 bg-slate-900 p-0.5 text-slate-400 hover:text-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-20 w-20 flex-col gap-1 border-dashed border-slate-700 bg-transparent text-slate-400 hover:bg-slate-900"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[10px]">{t('screens.commerceportal.productForm.imageAdd')}</span>
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />
    </div>
  );
}
