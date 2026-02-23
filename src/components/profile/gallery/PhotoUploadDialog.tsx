import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, ImageIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { file: File; caption?: string; is_public?: boolean }) => void;
  isUploading?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploadDialog({ open, onOpenChange, onUpload, isUploading }: PhotoUploadDialogProps) {
  const { translate } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload({ file, caption: caption.trim() || undefined, is_public: isPublic });
    setFile(null);
    setPreview(null);
    setCaption('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setFile(null); setPreview(null); setCaption(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate('gallery.upload', 'Upload Photo')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg mx-auto" />
            ) : (
              <div className="space-y-2">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {translate('gallery.dropzone', 'Drag & drop or click to select')}
                </p>
                <p className="text-xs text-muted-foreground/60">JPEG, PNG, WebP</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div>
            <Label htmlFor="photo-caption">{translate('gallery.caption', 'Caption')}</Label>
            <Input
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={translate('gallery.captionPlaceholder', 'Add a caption...')}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="photo-public">{translate('gallery.publicLabel', 'Visible to everyone')}</Label>
            <Switch id="photo-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            <Upload className="h-4 w-4 mr-1" />
            {isUploading ? translate('common.uploading', 'Uploading...') : translate('gallery.upload', 'Upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
