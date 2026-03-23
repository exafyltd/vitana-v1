import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Music } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";

interface MusicUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { file: File; title: string; description?: string; genre?: string; isPublic: boolean }) => Promise<void>;
  isUploading?: boolean;
  progress?: number;
}

const ACCEPTED_TYPES = [
  "audio/mpeg", "audio/wav", "audio/flac", "audio/aac",
  "audio/ogg", "audio/mp4", "audio/x-m4a",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function MusicUploadDialog({ open, onOpenChange, onUpload, isUploading, progress }: MusicUploadDialogProps) {
  const { translate } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: translate("gallery.invalidFormat", "Invalid format"), description: "MP3, WAV, FLAC, AAC, OGG, M4A", variant: "destructive" });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: translate("gallery.fileTooLarge", "File too large"), description: translate("gallery.maxSize", "Max size: 50 MB"), variant: "destructive" });
      return;
    }
    try {
      const buffer = await f.arrayBuffer();
      const materializedFile = new File([buffer], f.name, { type: f.type, lastModified: f.lastModified });
      setFile(materializedFile);
    } catch (err) {
      console.error('[MusicUpload] Failed to read file:', err);
      toast({ title: translate("gallery.readError", "Read error"), description: String(err), variant: "destructive" });
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
    setTitle("");
    setDescription("");
    setGenre("");
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    try {
      await onUpload({ file, title: title.trim(), description: description.trim() || undefined, genre: genre.trim() || undefined, isPublic });
      reset();
    } catch (err) {
      console.error('Music upload failed:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("gallery.uploadMusic", "Upload Music")}</DialogTitle>
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
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <Music className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Music className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {translate("gallery.dropzone", "Drag & drop or click to select")}
                </p>
                <p className="text-xs text-muted-foreground/60">MP3, WAV, FLAC, AAC, OGG, M4A · {translate("gallery.maxSizeHint", "Max. 50 MB")}</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/flac,audio/aac,audio/ogg,audio/mp4,audio/x-m4a"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div>
            <Label htmlFor="music-title">{translate("editProfile.title", "Title")} *</Label>
            <Input id="music-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={translate("gallery.musicTitlePlaceholder", "Track title")} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="music-desc">{translate("editProfile.description", "Description")}</Label>
            <Textarea id="music-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={translate("gallery.musicDescPlaceholder", "Optional description...")} className="mt-1" rows={2} />
          </div>

          <div>
            <Label htmlFor="music-genre">{translate("gallery.genre", "Genre")}</Label>
            <Input id="music-genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder={translate("gallery.genrePlaceholder", "e.g. Pop, Hip-Hop, Classical")} className="mt-1" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="music-public">{translate("gallery.publicLabel", "Visible to everyone")}</Label>
            <Switch id="music-public" checked={isPublic} onCheckedChange={setIsPublic} />
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
            {isUploading ? translate("common.uploading", "Uploading...") : translate("gallery.uploadMusic", "Upload Music")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
