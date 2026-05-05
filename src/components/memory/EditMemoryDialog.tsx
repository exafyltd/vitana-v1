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
import { Badge } from "@/components/ui/badge";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { t } from '@/lib/i18n-toast';

interface EditMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: {
    id: string;
    content: string;
    tags?: string[];
    source: string;
  } | null;
}

const MEMORY_CATEGORIES = [
  { id: "personal-identity", label: "Personal Identity" },
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "network-relationships", label: "Relationships" },
  { id: "business-projects", label: "Career & Goals" },
  { id: "values-aspirations", label: "Values & Beliefs" },
  { id: "lifestyle-routines", label: "Life Events & Routines" },
  { id: "learning-knowledge", label: "Skills & Knowledge" },
  { id: "finance-assets", label: "Financial" },
  { id: "location-environment", label: "Environment" },
  { id: "digital-footprint", label: "Digital Footprint" },
  { id: "autopilot-settings", label: "Autopilot & Context" },
  { id: "future-plans", label: "Future Plans" },
  { id: "general", label: "Uncategorized" },
];

export function EditMemoryDialog({ open, onOpenChange, memory }: EditMemoryDialogProps) {
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { updateKnowledge, isUpdating } = useKnowledgeBase("all");

  useEffect(() => {
    if (memory) {
      setContent(memory.content);
      // Extract category from tags (first non-"diary", non-"voice", non-"photo" tag)
      const categoryTag = memory.tags?.find(
        tag => tag !== "diary" && tag !== "voice" && tag !== "photo"
      ) || "general";
      setSelectedCategory(categoryTag);
    }
  }, [memory]);

  const handleSave = async () => {
    if (!memory) return;

    // Build new tags array with selected category
    const baseTags = memory.tags?.filter(tag => 
      tag === "diary" || tag === "voice" || tag === "photo"
    ) || ["diary"];
    const newTags = [selectedCategory, ...baseTags];

    await updateKnowledge({
      ...memory,
      content,
      tags: newTags,
    });
    
    onOpenChange(false);
  };

  if (!memory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('screens.memory.editMemory')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content Editor */}
          <div>
            <label className="text-sm font-medium mb-2 block">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Edit memory content..."
              className="resize-none"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {MEMORY_CATEGORIES.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || !content.trim()}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
