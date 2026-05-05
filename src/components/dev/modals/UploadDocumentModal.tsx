import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { devConfig } from "@/config/dev-config";
import { Upload } from "lucide-react";
import { notify, t } from '@/lib/i18n-toast';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentModal({ open, onOpenChange }: UploadDocumentModalProps) {
  const { toast } = useToast();
  const [docType, setDocType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    notify('toasts.dev.documentUploaded');
    onOpenChange(false);
    setDocType("");
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('screens.dev.uploadDocument')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="doc-type">{t('screens.dev.documentType')}</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger id="doc-type">
                <SelectValue placeholder={t('screens.dev.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schema">Schema</SelectItem>
                <SelectItem value="api">{t('screens.dev.apiDocumentation')}</SelectItem>
                <SelectItem value="design">{t('screens.dev.designSpec')}</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t('screens.dev.fileUpload')}</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('screens.dev.clickUploadDragDrop')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('screens.dev.pdfDocxMdUp10mb')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={devConfig.readonly}
            title={devConfig.readonly ? "Available in Phase 2" : undefined}
          >
            Upload Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
