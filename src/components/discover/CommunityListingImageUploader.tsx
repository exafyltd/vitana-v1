/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4): multi-image field for the
 * create/edit listing form. Controlled component (value/onChange of public
 * URLs), uploads immediately on file select — mirrors CoverPhotoPicker.tsx's
 * "upload now, hand the parent a URL" model rather than PhotoDiaryUploader's
 * "stage files, upload on submit" model, since this field can have several
 * images and the form's own submit shouldn't also own image upload.
 */

import { useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { uploadCommunityListingImage, deleteCommunityListingImage } from "@/lib/community-marketplace-image-upload";
import { notifyError, t } from "@/lib/i18n-toast";

const MAX_IMAGES = 10;

interface CommunityListingImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export function CommunityListingImageUploader({ value, onChange }: CommunityListingImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // URLs already part of the listing when this field mounted (edit mode) — removing
  // one of these must not delete the storage object immediately: the parent form
  // might still be cancelled, or its PATCH could fail, and the listing would be left
  // permanently referencing a deleted image. Only URLs uploaded fresh in this
  // session (never persisted anywhere) are safe to delete right away.
  const persistedUrlsRef = useRef<Set<string>>(new Set(value));

  const remainingSlots = MAX_IMAGES - value.length;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const selected = Array.from(files).slice(0, remainingSlots);
    if (files.length > selected.length) {
      notifyError("toasts.communityMarketplace.tooManyImages");
    }
    if (selected.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];
    let hadError = false;
    for (const file of selected) {
      try {
        uploaded.push(await uploadCommunityListingImage(file));
      } catch {
        hadError = true;
      }
    }
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (hadError) notifyError("toasts.communityMarketplace.imageUploadFailed");
    setUploading(false);
  };

  const removeAt = (index: number) => {
    const url = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (!persistedUrlsRef.current.has(url)) {
      void deleteCommunityListingImage(url);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFilesSelected(e.target.files)}
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map((url, index) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={t("screens.communityMarketplace.removeImage")}
              className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span className="text-[11px]">{t("screens.communityMarketplace.addPhotos")}</span>
          </button>
        )}
      </div>

      {value.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">{t("screens.communityMarketplace.photosOptionalHint")}</p>
      )}
    </div>
  );
}
