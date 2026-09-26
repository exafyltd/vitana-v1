import { useState } from "react";
import { PenSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { saveDiaryEntry } from "@/lib/memory-api";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface TextDiaryEditorProps {
  onSaveComplete?: () => void;
}

export function TextDiaryEditor({ onSaveComplete }: TextDiaryEditorProps) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!text.trim()) {
      notifyError('toasts.diary.emptyEntry', 'toasts.diary.pleaseWriteSomethingBeforeSaving');
      return;
    }

    setIsSaving(true);
    try {
      const savedText = text.trim();
      // VTID-04390: one diary write path — diary row, memory episode and the
      // Vitana Index sync (VTID-01983) in a single gateway call.
      const { index: sync } = await saveDiaryEntry({ text: savedText, source: 'text', tags: ['diary', 'text'] });
      const moved = sync?.index_delta?.total ?? 0;
      if (sync && moved > 0) {
        const { formatIndexDelta } = await import('@/lib/diary-index-sync');
        const breakdown = formatIndexDelta(sync.index_delta);
        toast({
          title: `Saved · Vitana Index +${moved}`,
          description: breakdown
            ? `${breakdown}. Tap your Index to see the move.`
            : `${sync.health_features_written} health signals logged.`,
        });
      } else {
        notify('toasts.diary.entrySaved', 'toasts.diary.yourDiaryEntryHasSavedSuccessfully');
      }

      setText("");
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      // VTID-01983: refresh the header Vitana Index badge after sync.
      queryClient.invalidateQueries({ queryKey: ['vitana_index'] });
      onSaveComplete?.();
    } catch (error) {
      console.error('Error saving text entry:', error);
      notifyError('toasts.diary.saveFailed', 'toasts.diary.failedSaveYourEntryPleaseTry');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          placeholder={t('screens.diary.typeYourTodaySEntry')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">{t('screens.diary.lengthCharacters', { length: text.length })}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || !text.trim()}
        className="w-full"
        size="lg"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? t('screens.diary.saving') : t('screens.diary.saveEntry')}
      </Button>
    </div>
  );
}
