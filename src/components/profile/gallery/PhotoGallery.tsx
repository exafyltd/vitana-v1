import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { GalleryPhoto } from "@/hooks/useProfileGallery";
import { PhotoUploadDialog } from "./PhotoUploadDialog";
import { PhotoLightbox } from "./PhotoLightbox";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from '@/lib/i18n-toast';

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  isOwner: boolean;
  onUpload: (data: { file: File; caption?: string; is_public?: boolean }) => void | Promise<void>;
  onDelete: (id: string) => void;
  isUploading?: boolean;
  compact?: boolean;
}

export function PhotoGallery({ photos, isOwner, onUpload, onDelete, isUploading, compact }: PhotoGalleryProps) {
  const { translate } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const displayPhotos = compact ? photos.slice(0, 6) : photos;

  if (photos.length === 0 && !isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">📸</span>
          {translate('gallery.title', 'Photo Gallery')}
        </h3>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {translate('gallery.upload', 'Upload')}
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl bg-muted/30">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {translate('gallery.empty', 'No photos yet')}
          </p>
          {isOwner && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {translate('gallery.uploadFirst', 'Add your first photo')}
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(
          "grid gap-2",
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
        )}>
          {displayPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer bg-muted"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={photo.image_url}
                alt={photo.caption || translate('gallery.photo', 'Photo')}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white line-clamp-2">{photo.caption}</p>
                </div>
              )}
              {isOwner && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(photo.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {compact && photos.length > 6 && (
        <p className="text-xs text-muted-foreground text-center">{t('screens.profile.value0MorePhotos', { value0: photos.length - 6 })}
        </p>
      )}

      <PhotoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={(data) => { onUpload(data); setUploadOpen(false); }}
        isUploading={isUploading}
      />

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate('gallery.deleteTitle', 'Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate('gallery.deleteDescription', 'This photo will be permanently deleted. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
