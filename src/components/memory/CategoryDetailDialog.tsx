import { useState } from "react";
import { LucideIcon, Plus, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { EditMemoryDialog } from "./EditMemoryDialog";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
const QUICK_CATEGORY_OPTIONS = [
  { id: "personal-identity", label: "Personal Identity" },
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "lifestyle-routines", label: "Lifestyle & Routines" },
  { id: "business-projects", label: "Business & Projects" },
  { id: "network-relationships", label: "Network & Relationships" },
  { id: "learning-knowledge", label: "Learning & Knowledge" },
  { id: "finance-assets", label: "Finance & Assets" },
  { id: "location-environment", label: "Location & Environment" },
  { id: "digital-footprint", label: "Digital Footprint" },
  { id: "values-aspirations", label: "Values & Aspirations" },
  { id: "autopilot-settings", label: "Autopilot Settings" },
  { id: "future-plans", label: "Future Plans" },
];

interface CategoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    id: string;
    title: string;
    icon: LucideIcon;
    gradient: string;
    subcategories: string[];
  };
  onAddMemory: () => void;
}

export function CategoryDetailDialog({
  open,
  onOpenChange,
  category,
  onAddMemory,
}: CategoryDetailDialogProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [editingMemory, setEditingMemory] = useState<any | null>(null);
  const { knowledgeItems, deleteKnowledge, updateKnowledge, isLoading } = useKnowledgeBase("all");

  const handleQuickCategorize = (memory: any, newCategoryId: string) => {
    const updatedTags = memory.tags
      .filter((tag: string) => tag !== "general")
      .concat(newCategoryId);
    
    updateKnowledge({
      id: memory.id,
      source: memory.source,
      content: memory.content,
      tags: updatedTags
    });
  };

  // Filter memories by category (check both tags and memoryType)
  const categoryMemories = knowledgeItems.filter((item) => {
    const tags = item.tags || [];
    return tags.includes(category.id) || item.memoryType === category.id;
  });

  // Filter by subcategory if selected
  const filteredMemories = selectedSubcategory
    ? categoryMemories.filter((item) => {
        const tags = item.tags || [];
        return tags.includes(selectedSubcategory);
      })
    : categoryMemories;

  const Icon = category.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        {/* Header */}
        <div className={cn("relative overflow-hidden p-6", category.gradient)}>
          <DialogHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">{category.title}</DialogTitle>
                  <p className="text-sm opacity-90 mt-1">
                    {filteredMemories.length} {filteredMemories.length === 1 ? "memory" : "memories"}
                  </p>
                </div>
              </div>
              <Button
                onClick={onAddMemory}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('screens.memory.addMemory')}
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Subcategories */}
        <div className="px-6 py-4 border-b">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedSubcategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedSubcategory(null)}
            >{t('screens.memory.allLength', { length: categoryMemories.length })}
            </Badge>
            {category.subcategories.map((sub) => {
              const count = categoryMemories.filter((item) =>
                (item.tags || []).includes(sub)
              ).length;
              return (
                <Badge
                  key={sub}
                  variant={selectedSubcategory === sub ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedSubcategory(sub)}
                >
                  {sub} ({count})
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Memories List */}
        <ScrollArea className="flex-1 px-6 py-4 max-h-[400px]">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">{t('screens.memory.loadingMemories')}
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>{t('screens.memory.noMemoriesYetThisCategory')}</p>
              <p className="text-sm mt-2">{t('screens.memory.clickAddMemoryGetStarted')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((memory) => (
                <Card key={memory.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{memory.content}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {memory.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {category.id === "general" && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">{t('screens.memory.quickCategorize')}</p>
                            <div className="flex flex-wrap gap-1">
                              {QUICK_CATEGORY_OPTIONS.map((cat) => (
                                <Badge
                                  key={cat.id}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                  onClick={() => handleQuickCategorize(memory, cat.id)}
                                >
                                  {cat.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {fmtDate(new Date(memory.createdAt))} •{" "}
                          {memory.source === "ai" ? "Insight" : "Diary"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingMemory(memory)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteKnowledge({ id: memory.id, source: memory.source })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <EditMemoryDialog
        open={!!editingMemory}
        onOpenChange={(open) => !open && setEditingMemory(null)}
        memory={editingMemory}
      />
    </Dialog>
  );
}
