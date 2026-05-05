import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VoiceRecorder } from "@/components/ui/voice-recorder";
import { Mic, Type, Camera, X, Loader2 } from "lucide-react";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
}

type InputMode = "text" | "voice" | "photo";

const MEMORY_CATEGORIES = [
  { id: "personal-identity", label: "Personal Identity" },
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "lifestyle-routines", label: "Lifestyle & Routines" },
  { id: "business-projects", label: "Business & Projects" },
  { id: "network-relationships", label: "Relationships" },
  { id: "learning-knowledge", label: "Skills & Knowledge" },
  { id: "finance-assets", label: "Financial" },
  { id: "location-environment", label: "Environment" },
  { id: "digital-footprint", label: "Digital Footprint" },
  { id: "values-aspirations", label: "Values & Aspirations" },
  { id: "autopilot-settings", label: "Autopilot & Context" },
  { id: "future-plans", label: "Future Plans" },
  { id: "general", label: "Uncategorized" },
];

export function AddMemoryDialog({ open, onOpenChange, defaultCategory }: AddMemoryDialogProps) {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || "");

  // Sync selectedCategory when dialog opens or defaultCategory changes
  useEffect(() => {
    if (open) {
      setSelectedCategory(defaultCategory || "");
    }
  }, [open, defaultCategory]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { createKnowledge, isCreating } = useKnowledgeBase();
  const { toast } = useToast();

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    const file = new File([audioBlob], `voice-diary-${Date.now()}.webm`, {
      type: audioBlob.type
    });
    setAudioFile(file);
    setIsRecording(false);
    
    // Auto-generate content placeholder
    setContent(`Voice recording (${Math.round(duration)}s) - Transcription pending...`);
    
    notify('toasts.memory.voiceRecorded');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifyError('toasts.memory.invalidFile', 'toasts.memory.pleaseSelectImageFile');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setInputMode("photo");
  };

  const handleSubmit = async () => {
    if (!content.trim() && !audioFile && !imageFile) {
      notifyError('toasts.memory.emptyMemory', 'toasts.memory.pleaseAddSomeContentYourMemory');
      return;
    }

    try {
      const tags = [selectedCategory || "general", "diary"];
      
      // If there's media, upload it first
      if (audioFile || imageFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const file = audioFile || imageFile!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const bucket = audioFile ? 'voice-diaries' : 'memory-photos';

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        // Create memory with media reference
        createKnowledge({
          content: content || (audioFile ? "Voice diary entry" : "Photo memory"),
          source: "diary",
          tags: [...tags, audioFile ? "voice" : "photo"],
          metadata: {
            mediaUrl: publicUrl,
            mediaType: audioFile ? "audio" : "image",
            duration: audioFile ? undefined : null
          }
        });
      } else {
        // Text-only memory
        createKnowledge({
          content,
          source: "diary",
          tags
        });
      }

      // Reset form
      setContent("");
      setSelectedCategory("");
      setAudioFile(null);
      setImageFile(null);
      setImagePreview(null);
      setInputMode("text");
      onOpenChange(false);

      notify('toasts.memory.memorySaved', 'toasts.memory.yourMemoryHasAddedYourKnowledge');
    } catch (error) {
      console.error("Error saving memory:", error);
      notifyError('toasts.memory.saveFailed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t('screens.memory.addMemory')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Input Mode Selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={inputMode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("text")}
              className="flex-1"
            >
              <Type className="w-4 h-4 mr-2" />
              {t('screens.memory.text')}
            </Button>
            <Button
              type="button"
              variant={inputMode === "voice" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("voice")}
              className="flex-1"
            >
              <Mic className="w-4 h-4 mr-2" />
              {t('screens.memory.voice')}
            </Button>
            <Button
              type="button"
              variant={inputMode === "photo" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setInputMode("photo");
                document.getElementById('image-upload')?.click();
              }}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              {t('screens.memory.photo')}
            </Button>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>{t('screens.memory.categoryOptional')}</Label>
            <div className="flex flex-wrap gap-2">
              {MEMORY_CATEGORIES.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? "" : cat.id)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Input Area */}
          {inputMode === "voice" && (
            <div className="space-y-4">
              {!isRecording && !audioFile && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('screens.memory.clickBelowStartRecordingYourVoice')}
                  </p>
                  <Button onClick={() => setIsRecording(true)}>
                    <Mic className="w-4 h-4 mr-2" />
                    {t('screens.memory.startRecording')}
                  </Button>
                </div>
              )}

              {isRecording && (
                <div className="border-2 border-primary rounded-lg p-4">
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecordingComplete}
                    onCancel={() => setIsRecording(false)}
                  />
                </div>
              )}

              {audioFile && (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <Mic className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{audioFile.name}</p>
                    <p className="text-xs text-muted-foreground">{t('screens.memory.value0Kb', { value0: (audioFile.size / 1024).toFixed(0) })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAudioFile(null);
                      setContent("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="voice-notes">{t('screens.memory.additionalNotesOptional')}</Label>
                <Textarea
                  id="voice-notes"
                  placeholder={t('screens.memory.addContextDetailsAboutThisRecording')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {inputMode === "photo" && (
            <div className="space-y-4">
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              {!imagePreview ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">{t('screens.memory.clickBelowUploadPhotoMemory')}
                  </p>
                  <Button onClick={() => document.getElementById('image-upload')?.click()}>
                    <Camera className="w-4 h-4 mr-2" />{t('screens.memory.choosePhoto')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt={t('screens.memory.memoryPreview')}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo-caption">{t('screens.memory.caption')}</Label>
                    <Textarea
                      id="photo-caption"
                      placeholder={t('screens.memory.describeThisMemory')}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {inputMode === "text" && (
            <div className="space-y-2">
              <Label htmlFor="text-content">{t('screens.memory.memoryContent')}</Label>
              <Textarea
                id="text-content"
                placeholder={t('screens.memory.writeYourMemoryReflectionInsightHere')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              {t('screens.memory.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating || (!content.trim() && !audioFile && !imageFile)}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('screens.memory.saving')}
                </>
              ) : (
                "Save Memory"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
