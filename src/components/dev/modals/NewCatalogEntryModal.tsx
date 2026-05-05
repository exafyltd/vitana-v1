import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { devConfig } from "@/config/dev-config";
import { notify, t } from '@/lib/i18n-toast';

interface NewCatalogEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCatalogEntryModal({ open, onOpenChange }: NewCatalogEntryModalProps) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState("");
  const [entryName, setEntryName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    notify('toasts.dev.catalogEntryCreated');
    onOpenChange(false);
    setCatalog("");
    setEntryName("");
    setCategory("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('screens.dev.newCatalogEntry')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="catalog">{t('screens.dev.catalog')}</Label>
            <Select value={catalog} onValueChange={setCatalog}>
              <SelectTrigger id="catalog">
                <SelectValue placeholder={t('screens.dev.selectCatalog')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="components">{t('screens.dev.components')}</SelectItem>
                <SelectItem value="patterns">{t('screens.dev.designPatterns')}</SelectItem>
                <SelectItem value="apis">{t('screens.dev.apiEndpoints')}</SelectItem>
                <SelectItem value="schemas">{t('screens.dev.dataSchemas')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-name">{t('screens.dev.entryName')}</Label>
            <Input 
              id="entry-name" 
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder="e.g., ButtonComponent, UserSchema"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('screens.dev.category')}</Label>
            <Input 
              id="category" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., UI, Data, Infrastructure"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('screens.dev.description')}</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and usage of this catalog entry"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.dev.cancel')}
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={devConfig.readonly}
            title={devConfig.readonly ? "Available in Phase 2" : undefined}
          >
            {t('screens.dev.createEntry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
