import { useState, useRef } from "react";
import { Image, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { syncDiaryToIndex, formatIndexDelta } from "@/lib/diary-index-sync";
import { notify, notifyError } from '@/lib/i18n-toast';

interface PhotoDiaryUploaderProps {
  onUploadComplete?: () => void;
}

export function PhotoDiaryUploader({ onUploadComplete }: PhotoDiaryUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrls(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      notifyError('toasts.diary.noPhotosSelected', 'toasts.diary.pleaseSelectAtLeastOnePhoto');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload photos to storage
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        console.log('Uploading file:', fileName);
        const { error: uploadError } = await supabase.storage
          .from('diary-photos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL (bucket is public)
        const { data: { publicUrl } } = supabase.storage
          .from('diary-photos')
          .getPublicUrl(fileName);

        console.log('Public URL created:', publicUrl);
        uploadedUrls.push(publicUrl);
      }

      console.log('All uploads complete. URLs:', uploadedUrls);

      // Save entry to database with photo URLs
      const { data: insertedEntry, error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: user.id,
          text: caption || "Photo entry",
          source: 'photo',
          tags: ['diary', 'photo'],
          attachments: uploadedUrls
        })
        .select('*')
        .single();

      if (error) throw error;

      // Optimistically update active diary caches so the new card appears instantly
      const prependIfMissing = (oldData: any[] | undefined) => {
        if (!insertedEntry) return oldData;
        const entries = Array.isArray(oldData) ? oldData : [];
        if (entries.some((entry) => entry.id === insertedEntry.id)) {
          return entries;
        }

        return [insertedEntry, ...entries].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      };

      queryClient.setQueryData(['diary-entries', 'all'], prependIfMissing);
      queryClient.setQueryData(['diary-entries', 'photo'], prependIfMissing);
      await queryClient.invalidateQueries({ queryKey: ['diary-entries'], exact: false });

      // VTID-01983: photo path syncs the caption to the Index when present.
      // Photo-only entries (no caption) skip extraction but still mark the
      // user as having journaled (the gateway always emits journal_entry).
      const captionText = (caption || "").trim();
      const sync = captionText.length > 0 ? await syncDiaryToIndex(captionText) : null;
      const moved = sync?.index_delta?.total ?? 0;
      queryClient.invalidateQueries({ queryKey: ['vitana_index'] });

      if (sync && moved > 0) {
        const breakdown = formatIndexDelta(sync.index_delta);
        toast({
          title: `Saved · Vitana Index +${moved}`,
          description: breakdown
            ? `${breakdown}. Tap your Index to see the move.`
            : `${sync.health_features_written} health signals logged from your caption.`,
        });
      } else {
        notify('toasts.diary.photosUploaded', 'toasts.diary.yourPhotoDiaryEntryHasSaved');
      }

      // Reset form
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCaption("");
      onUploadComplete?.();
    } catch (error) {
      console.error('Error uploading photos:', error);
      notifyError('toasts.diary.uploadFailed', 'toasts.diary.failedSaveYourPhotoEntryPlease');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {previewUrls.length === 0 ? (
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          size="lg"
          variant="outline"
        >
          <Image className="w-5 h-5 mr-2" />
          Upload Today's Entry
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square">
                <img 
                  src={url} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Add a caption (optional)..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Save Entry"}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <Image className="w-4 h-4 mr-2" />
              Add More
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
