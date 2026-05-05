import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import type { ActivityHistoryItem } from "@/hooks/useActivityHistory";
import { t } from '@/lib/i18n-toast';

interface PromoteToKnowledgeDialogProps {
  activity: ActivityHistoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteToKnowledgeDialog({
  activity,
  open,
  onOpenChange,
}: PromoteToKnowledgeDialogProps) {
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState<"personal" | "health" | "preference" | "goal">("personal");
  const [tags, setTags] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(0.8);
  
  const { createKnowledge, isCreating } = useKnowledgeBase();
  const { logActivity } = useActivityLogger();

  // Initialize content when dialog opens
  useState(() => {
    if (activity && open) {
      setContent(activity.content);
    }
  });

  const handleSave = async () => {
    if (!activity || !content.trim()) return;

    try {
      await createKnowledge({
        content: content.trim(),
        source: "promoted_from_activity",
        memoryType,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        confidenceScore,
        metadata: {
          source_activity_id: activity.id,
          source_activity_type: activity.activityType,
          promoted_at: new Date().toISOString(),
        },
      });

      // Log the promotion activity
      await logActivity({
        activityType: "memory.promote",
        activityData: {
          source_activity_id: activity.id,
          source_activity_type: activity.activityType,
          memory_type: memoryType,
          content: content.substring(0, 100),
        },
        contextData: {
          conversation_id: activity.conversationId,
        },
      });

      onOpenChange(false);
      setContent("");
      setTags("");
    } catch (error) {
      console.error("Failed to promote activity:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.memory.saveAsKnowledge')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="content">{t('screens.memory.content')}</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the knowledge to save..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memoryType">{t('screens.memory.category')}</Label>
              <Select value={memoryType} onValueChange={(value: any) => setMemoryType(value)}>
                <SelectTrigger id="memoryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{t('screens.memory.personal')}</SelectItem>
                  <SelectItem value="health">{t('screens.memory.health')}</SelectItem>
                  <SelectItem value="preference">{t('screens.memory.preference')}</SelectItem>
                  <SelectItem value="goal">{t('screens.memory.goal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence: {(confidenceScore * 100).toFixed(0)}%</Label>
              <Input
                id="confidence"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={confidenceScore}
                onChange={(e) => setConfidenceScore(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{t('screens.memory.tagsCommaseparated')}</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., birthday, family, important"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            {t('screens.memory.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isCreating || !content.trim()}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to Knowledge Base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
