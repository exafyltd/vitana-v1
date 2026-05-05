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
import { notify } from '@/lib/i18n-toast';

interface ImportScreenListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportScreenListModal({ open, onOpenChange }: ImportScreenListModalProps) {
  const { toast } = useToast();
  const [importFormat, setImportFormat] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const handleImport = () => {
    notify('toasts.dev.screenListImported', 'toasts.dev.screenDefinitionsHaveImportedSuccessfully');
    onOpenChange(false);
    setImportFormat("");
    setSource("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Screen List</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="format">Import Format</Label>
            <Select value={importFormat} onValueChange={setImportFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input 
              id="source" 
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., Figma export, Design system"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File Upload</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">JSON, YAML, CSV, XML up to 5MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Import Notes</Label>
            <Textarea 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this import (optional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={devConfig.readonly}
            title={devConfig.readonly ? "Available in Phase 2" : undefined}
          >
            Import List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
