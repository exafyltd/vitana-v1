import { useState, useRef } from "react";
import { Image, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to upload",
        variant: "destructive",
      });
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
        
        const { error: uploadError } = await supabase.storage
          .from('diary-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get authenticated URL (valid for 1 year)
        const { data } = await supabase.storage
          .from('diary-photos')
          .createSignedUrl(fileName, 31536000); // 1 year in seconds

        if (data?.signedUrl) {
          uploadedUrls.push(data.signedUrl);
        }
      }

      // Save entry to database with photo URLs
      const { error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: user.id,
          text: caption || "Photo entry",
          source: 'photo',
          tags: ['diary', 'photo'],
          attachments: uploadedUrls
        });

      if (error) throw error;

      toast({
        title: "Photos uploaded!",
        description: "Your photo diary entry has been saved successfully.",
      });

      // Reset form
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCaption("");
      onUploadComplete?.();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Upload failed",
        description: "Failed to save your photo entry. Please try again.",
        variant: "destructive",
      });
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
