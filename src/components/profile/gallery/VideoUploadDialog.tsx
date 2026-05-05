import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Video } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { lookup, t } from '@/lib/i18n-toast';

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { file: File; title: string; description?: string; isPublic: boolean }) => Promise<void>;
  isUploading?: boolean;
  progress?: number;
}

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/3gpp", "video/3gpp2"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function VideoUploadDialog({ open, onOpenChange, onUpload, isUploading, progress }: VideoUploadDialogProps) {
  const { translate } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: translate("gallery.invalidFormat", "Ungültiges Format"), description: lookup('toasts.profile.mp4WebmMov'), variant: "destructive" });
      return;
    }
    if (f.size > MAX_VIDEO_SIZE) {
      toast({ title: translate("gallery.fileTooLarge", "Datei zu groß"), description: translate("gallery.maxSize", "Maximale Dateigröße: 50 MB"), variant: "destructive" });
      return;
    }
    // Materialize file into memory immediately to prevent Android file descriptor issues
    try {
      const buffer = await f.arrayBuffer();
      const materializedFile = new File([buffer], f.name, { type: f.type, lastModified: f.lastModified });
      setFile(materializedFile);
      setPreview(URL.createObjectURL(materializedFile));
    } catch (err) {
      console.error('[VideoUpload] Failed to read file into memory:', err);
      toast({ title: translate("gallery.readError", "Fehler beim Lesen"), description: String(err), variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    try {
      await onUpload({ file, title: title.trim(), description: description.trim() || undefined, isPublic });
      reset();
    } catch (err) {
      // Dialog stays open so user can retry
      console.error('Video upload failed:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("gallery.uploadVideo", "Upload Video")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <video src={preview} className="w-full max-h-48 rounded-lg mx-auto" controls preload="metadata" />
            ) : (
              <div className="space-y-2">
                <Video className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {translate("gallery.dropzone", "Drag & drop or click to select")}
                </p>
                <p className="text-xs text-muted-foreground/60">{t('screens.profile.mp4WebmMovValue0', { value0: translate("gallery.maxSizeHint", "Max. 50 MB") })}</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/3gpp,video/3gpp2"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div>
            <Label htmlFor="video-title">{translate("editProfile.title", "Title")} *</Label>
            <Input
              id="video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={translate("editProfile.titlePlaceholder", "Video title")}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="video-desc">{translate("editProfile.description", "Description")}</Label>
            <Textarea
              id="video-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={translate("editProfile.descriptionPlaceholder", "Optional description...")}
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="video-public">{translate("gallery.publicLabel", "Visible to everyone")}</Label>
            <Switch id="video-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {isUploading && progress !== undefined && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || !title.trim() || isUploading}>
            <Upload className="h-4 w-4 mr-1" />
            {isUploading ? translate("common.uploading", "Uploading...") : translate("gallery.uploadVideo", "Upload Video")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
