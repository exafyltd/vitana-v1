import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTemplates } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDialog({ open, onOpenChange }: TemplateDialogProps) {
  const { createTemplate } = useTemplates();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await createTemplate.mutateAsync({
      user_id: user.id,
      name,
      content,
      category,
    });

    setName("");
    setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.sharing.saveAsTemplate')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="template-name">{t('screens.sharing.templateName')}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Launch Post"
              required
            />
          </div>
          <div>
            <Label htmlFor="template-content">Content</Label>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your template content..."
              rows={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="general"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
