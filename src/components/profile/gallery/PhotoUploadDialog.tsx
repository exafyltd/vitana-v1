import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, ImageIcon, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

interface PhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { file: File; caption?: string; is_public?: boolean }) => void | Promise<void>;
  isUploading?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploadDialog({ open, onOpenChange, onUpload, isUploading }: PhotoUploadDialogProps) {
  const { translate } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter(f => ACCEPTED_TYPES.includes(f.type));
    if (valid.length === 0) return;
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length });
      await onUpload({ file: files[i], caption: caption.trim() || undefined, is_public: isPublic });
    }
    setUploadProgress(null);
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    previews.forEach(p => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setCaption('');
  };

  const isWorking = !!uploadProgress;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isWorking) { reset(); onOpenChange(v); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate('gallery.upload', 'Upload Photos')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !isWorking && fileRef.current?.click()}
          >
            {previews.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {!isWorking && (
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!isWorking && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {translate('gallery.tapToAddMore', 'Tap to add more')}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {translate('gallery.dropzoneMultiple', 'Select multiple photos')}
                </p>
                <p className="text-xs text-muted-foreground/60">{t('screens.profile.jpegPngWebp')}</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {uploadProgress && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground text-center">
                {translate('gallery.uploadingProgress', `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`)}
              </p>
              <Progress value={(uploadProgress.current / uploadProgress.total) * 100} className="h-2" />
            </div>
          )}

          <div>
            <Label htmlFor="photo-caption">{translate('gallery.caption', 'Caption')}</Label>
            <Input
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={translate('gallery.captionPlaceholder', 'Add a caption...')}
              className="mt-1"
              disabled={isWorking}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="photo-public">{translate('gallery.publicLabel', 'Visible to everyone')}</Label>
            <Switch id="photo-public" checked={isPublic} onCheckedChange={setIsPublic} disabled={isWorking} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
            {translate('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={files.length === 0 || isWorking || isUploading}>
            <Upload className="h-4 w-4 mr-1" />
            {isWorking
              ? `${uploadProgress!.current}/${uploadProgress!.total}...`
              : files.length > 1
                ? `${translate('gallery.upload', 'Upload')} ${files.length} ${translate('gallery.photos', 'Photos')}`
                : translate('gallery.upload', 'Upload')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
