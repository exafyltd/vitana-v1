import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload as UploadIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useUpdateStream, type LiveStream } from "@/hooks/useLiveStreams";
import { resizeImageFile } from "@/lib/resizeImage";
import { notifySuccess, notifyError, t } from "@/lib/i18n-toast";
import type { LiveRoom } from "@/components/liverooms/LiveRoomCard";

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The room/session being edited. Its `id` is the community_live_streams row id. */
  room: LiveRoom | null;
  onSaved?: () => void;
}

/**
 * Edit an existing (scheduled or live) session: title, description and cover
 * image. Writes straight to `community_live_streams` via useUpdateStream — the
 * same table the Live Rooms listing reads — so changes (including a new cover)
 * show up immediately. The creator-only RLS policy on that table
 * (`auth.uid() = created_by`) gates the update server-side.
 *
 * Cover images are run through `resizeImageFile` first, so any size the user
 * picks is downscaled/compressed before upload (no more 2 MB rejections).
 */
export function EditSessionDialog({ open, onOpenChange, room, onSaved }: EditSessionDialogProps) {
  const { user } = useAuth();
  const { mutateAsync: updateStream } = useUpdateStream();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Prefill from the room each time the dialog opens for a (new) room.
  useEffect(() => {
    if (open && room) {
      setTitle(room.title || "");
      setDescription(room.description || "");
      setSelectedImage(null);
      setImagePreviewUrl(room.imageUrl || "");
    }
  }, [open, room]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notifyError(
        "liveRooms.goLivePopup.errors.invalidFileTypeTitle",
        "liveRooms.goLivePopup.errors.invalidFileTypeDesc",
      );
      return;
    }

    // Accept any image: auto-resize/compress before we keep it.
    let processed = file;
    try {
      processed = await resizeImageFile(file, { maxEdge: 1920, quality: 0.85 });
    } catch (e) {
      console.warn("[EditSessionDialog] Image resize failed, using original:", e);
    }

    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(processed);
    setImagePreviewUrl(URL.createObjectURL(processed));
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl("");
  };

  const handleSave = async () => {
    if (!room) return;

    setIsSaving(true);
    try {
      const updates: Partial<LiveStream> = {
        title: title.trim() || room.title,
        description: description.trim() || null,
      };

      // Upload a new cover only if the user picked one.
      if (selectedImage && user) {
        const ext = selectedImage.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/live-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(filePath, selectedImage, {
            upsert: true,
            contentType: selectedImage.type,
          });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("covers").getPublicUrl(filePath);
        updates.cover_image_url = data.publicUrl;
      } else if (!imagePreviewUrl) {
        // Cover was explicitly removed.
        updates.cover_image_url = null;
      }

      await updateStream({ id: room.id, updates });

      notifySuccess(
        "liveRooms.goLivePopup.success.streamUpdatedTitle",
        "liveRooms.goLivePopup.success.streamUpdatedDesc",
      );
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      console.error("[EditSessionDialog] update failed:", e);
      notifyError(
        "liveRooms.goLivePopup.errors.genericTitle",
        "liveRooms.goLivePopup.errors.genericDesc",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("liveRooms.editSession.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label htmlFor="edit-session-title">
              {t("liveRooms.goLivePopup.streamTitleLabel")}
            </Label>
            <Input
              id="edit-session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-session-description">
              {t("liveRooms.goLivePopup.descriptionLabel")}
            </Label>
            <Textarea
              id="edit-session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cover image */}
          <div>
            <Label>{t("liveRooms.goLivePopup.coverLabel")}</Label>
            {imagePreviewUrl ? (
              <div className="relative mt-1 rounded-lg overflow-hidden border">
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  aria-label={t("liveRooms.editSession.changeCover")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <label className="mt-2 flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
              <UploadIcon className="h-4 w-4" />
              <span>
                {imagePreviewUrl
                  ? t("liveRooms.editSession.changeCover")
                  : t("liveRooms.goLivePopup.coverLabel")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {t("liveRooms.goLivePopup.coverUploadHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("liveRooms.goLivePopup.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? t("liveRooms.editSession.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
