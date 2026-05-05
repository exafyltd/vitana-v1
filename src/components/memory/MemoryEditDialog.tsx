import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { t } from '@/lib/i18n-toast';

interface TimelineMemory {
  id: string;
  content: string;
  source: "ai" | "diary" | "conversation";
  memoryType?: string;
  sourceType?: string;
  tags?: string[];
  confidenceScore?: number;
  duration?: number;
  createdAt: string;
  metadata?: any;
  conversationId?: string;
  role?: "user" | "assistant";
}

interface MemoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory?: TimelineMemory | null;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export function MemoryEditDialog({
  open,
  onOpenChange,
  memory,
  onSave,
  isSaving,
}: MemoryEditDialogProps) {
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState<string>("fact");
  const [confidenceScore, setConfidenceScore] = useState<number>(80);
  const [tags, setTags] = useState<string>("");
  const [source, setSource] = useState<"ai" | "diary">("ai");

  useEffect(() => {
    if (memory) {
      // Editing existing memory
      setContent(memory.content);
      setMemoryType(memory.memoryType || "fact");
      setConfidenceScore(memory.confidenceScore || 80);
      setTags(memory.tags?.join(", ") || "");
      setSource(memory.source === "conversation" ? "ai" : memory.source);
    } else {
      // Creating new memory
      setContent("");
      setMemoryType("fact");
      setConfidenceScore(80);
      setTags("");
      setSource("ai");
    }
  }, [memory, open]);

  const handleSave = () => {
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const data = {
      id: memory?.id,
      content,
      memoryType,
      confidenceScore,
      tags: tagsArray,
      source: memory?.source || source,
      isNew: !memory,
    };

    onSave(data);
  };

  const isConversation = memory?.source === "conversation";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {memory ? "Edit Memory" : "Create Memory"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter memory content..."
              rows={4}
              disabled={isConversation}
            />
            {isConversation && (
              <p className="text-xs text-muted-foreground">
                Conversation messages cannot be edited
              </p>
            )}
          </div>

          {/* Source Type (only for new memories) */}
          {!memory && (
            <div className="space-y-2">
              <Label htmlFor="source">{t('screens.memory.sourceType')}</Label>
              <Select value={source} onValueChange={(v: "ai" | "diary") => setSource(v)}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">{t('screens.memory.aiInsight')}</SelectItem>
                  <SelectItem value="diary">{t('screens.memory.diaryEntry')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Memory Type (for AI insights) */}
          {(source === "ai" || memory?.source === "ai") && !isConversation && (
            <div className="space-y-2">
              <Label htmlFor="memoryType">{t('screens.memory.memoryType')}</Label>
              <Select value={memoryType} onValueChange={setMemoryType}>
                <SelectTrigger id="memoryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fact">Fact</SelectItem>
                  <SelectItem value="preference">Preference</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Confidence Score (for AI insights) */}
          {(source === "ai" || memory?.source === "ai") && !isConversation && (
            <div className="space-y-2">
              <Label htmlFor="confidence">
                Confidence Score: {confidenceScore}%
              </Label>
              <Slider
                id="confidence"
                value={[confidenceScore]}
                onValueChange={(v) => setConfidenceScore(v[0])}
                min={0}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* Tags */}
          {!isConversation && (
            <div className="space-y-2">
              <Label htmlFor="tags">{t('screens.memory.tagsCommaseparated')}</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="health, personal, goals"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !content.trim() || isConversation}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
