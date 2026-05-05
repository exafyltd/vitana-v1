import { useRef, useState } from "react";
import { Upload, X, Move } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { AvatarPositioner } from "./AvatarPositioner";
import { notify, notifyError } from '@/lib/i18n-toast';

export interface AvatarUploadValue {
  url: string;
  offsetX: number;
  offsetY: number;
}

interface AvatarUploadFieldProps {
  value: AvatarUploadValue;
  onChange: (next: AvatarUploadValue) => void;
  fallbackInitials?: string;
  /** Optional; if omitted the component reads supabase.auth.getUser() at upload time. */
  userId?: string;
}

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

export function AvatarUploadField({
  value,
  onChange,
  fallbackInitials = "U",
  userId,
}: AvatarUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [showPositioner, setShowPositioner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const fileExt = (file.name.split(".").pop() || "").toLowerCase();
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      fileExt === "heic" ||
      fileExt === "heif";

    if (isHeic) {
      notifyError('toasts.profile.uploadFailed', 'toasts.profile.heicheifFormatNotSupportedByBrowsers');
      return;
    }

    if (!file.type.startsWith("image/") || !ALLOWED_EXTS.includes(fileExt)) {
      notifyError('toasts.profile.uploadFailed');
      return;
    }

    setUploading(true);
    try {
      let uid = userId;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id;
      }
      if (!uid) throw new Error("Not authenticated");

      const fileName = `${uid}/avatar-${Date.now()}.${fileExt}`;
      // Materialize file into memory for iOS Safari reliability
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      onChange({ url: publicUrl, offsetX: 50, offsetY: 50 });
      notify('toasts.profile.avatarUploaded', 'toasts.profile.repositionImageIfNeeded');
      setShowPositioner(true);
    } catch (error: any) {
      notifyError('toasts.profile.uploadFailed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelected}
      />

      <Avatar className="w-20 h-20">
        <AvatarImage
          src={value.url || undefined}
          style={avatarPositionStyle(value.offsetX, value.offsetY)}
        />
        <AvatarFallback className="text-lg">
          {fallbackInitials}
        </AvatarFallback>
      </Avatar>

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value.url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPositioner(true)}
            disabled={uploading}
          >
            <Move className="w-4 h-4 mr-2" />
            Reposition
          </Button>
        )}
        {value.url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({ url: "", offsetX: 50, offsetY: 50 })
            }
            disabled={uploading}
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {value.url && (
        <AvatarPositioner
          open={showPositioner}
          onOpenChange={setShowPositioner}
          imageUrl={value.url}
          initialOffsetX={value.offsetX}
          initialOffsetY={value.offsetY}
          onConfirm={(x, y) =>
            onChange({ url: value.url, offsetX: x, offsetY: y })
          }
        />
      )}
    </div>
  );
}
