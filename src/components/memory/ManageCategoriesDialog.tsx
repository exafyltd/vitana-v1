import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  count: number;
}

export function ManageCategoriesDialog({ open, onOpenChange }: ManageCategoriesDialogProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "Chat", emoji: "💬", color: "blue", count: 42 },
    { id: "2", name: "Memory", emoji: "🧠", color: "purple", count: 28 },
    { id: "3", name: "Wallet", emoji: "💰", color: "green", count: 15 },
    { id: "4", name: "Discover", emoji: "❤️", color: "red", count: 33 },
    { id: "5", name: "Calendar", emoji: "📅", color: "orange", count: 19 },
    { id: "6", name: "Autopilot", emoji: "🤖", color: "cyan", count: 8 },
    { id: "7", name: "Health", emoji: "🩺", color: "pink", count: 12 },
    { id: "8", name: "Community", emoji: "👥", color: "indigo", count: 25 },
  ]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      notifyError('toasts.memory.error', 'toasts.memory.categoryNameRequired');
      return;
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      emoji: newCategoryEmoji || "📁",
      color: "gray",
      count: 0,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryEmoji("");
    
    notify('toasts.memory.categoryAdded');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" category?`)) {
      return;
    }

    setCategories(categories.filter(cat => cat.id !== id));
    notify('toasts.memory.categoryDeleted');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            {t('screens.memory.manageCategories')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">{t('screens.memory.addNewCategory')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="category-name">{t('screens.memory.categoryName')}</Label>
                <Input
                  id="category-name"
                  placeholder={t('screens.memory.eGWorkPersonal')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-emoji">{t('screens.memory.emojiOptional')}</Label>
                <Input
                  id="category-emoji"
                  placeholder="📁"
                  maxLength={2}
                  value={newCategoryEmoji}
                  onChange={(e) => setNewCategoryEmoji(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddCategory} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.memory.addCategory')}
            </Button>
          </div>

          {/* Existing Categories */}
          <div className="space-y-3">
            <h3 className="font-semibold">{t('screens.memory.existingCategories')}</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{category.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.count} items
                      </div>
                    </div>
                    <Badge variant="outline">{category.color}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        notify('toasts.memory.comingSoon', 'toasts.memory.editFunctionalityWillAvailableSoon');
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      disabled={category.count > 0}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{t('screens.memory.note')}</strong> Categories with existing items cannot be deleted. You can edit them or merge them with other categories.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => onOpenChange(false)}>
              {t('screens.memory.done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
