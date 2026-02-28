import { useState } from "react";
import { PenSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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
      toast({
        title: "Empty entry",
        description: "Please write something before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('diary_entries')
        .insert({
          user_id: user.id,
          text: text.trim(),
          source: 'text',
          tags: ['diary', 'text']
        });

      if (error) throw error;

      toast({
        title: "Entry saved!",
        description: "Your diary entry has been saved successfully.",
      });

      setText("");
      onSaveComplete?.();
    } catch (error) {
      console.error('Error saving text entry:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          placeholder="Type your today's entry..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {text.length} characters
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || !text.trim()}
        className="w-full"
        size="lg"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Entry"}
      </Button>
    </div>
  );
}
