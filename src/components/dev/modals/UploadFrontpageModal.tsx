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

interface UploadFrontpageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadFrontpageModal({ open, onOpenChange }: UploadFrontpageModalProps) {
  const { toast } = useToast();
  const [portal, setPortal] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    notify('toasts.dev.frontpageUploaded');
    onOpenChange(false);
    setPortal("");
    setVersion("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Frontpage</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="portal">Portal</Label>
            <Select value={portal} onValueChange={setPortal}>
              <SelectTrigger id="portal">
                <SelectValue placeholder="Select portal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maxina">Maxina</SelectItem>
                <SelectItem value="alkalma">Alkalma</SelectItem>
                <SelectItem value="earthlinks">Earthlinks</SelectItem>
                <SelectItem value="community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input 
              id="version" 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., 1.0.0, 2.1.3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Frontpage Document</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Figma file, or design spec</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's new in this frontpage version?"
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
            Upload Frontpage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
