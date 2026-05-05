import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { devConfig } from "@/config/dev-config";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

interface TriggerRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TriggerRunModal({ open, onOpenChange, onSuccess }: TriggerRunModalProps) {
  const [template, setTemplate] = useState("");
  const [runName, setRunName] = useState("");
  const [triggerMode, setTriggerMode] = useState("now");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!template || !runName) {
      notifyError('toasts.dev.pleaseFillAllRequiredFields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    notifySuccess('toasts.dev.autopilotRunTriggeredSuccessfully');
    onOpenChange(false);
    onSuccess?.();
    
    // Reset form
    setTemplate("");
    setRunName("");
    setTriggerMode("now");
    setNotes("");
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Trigger Autopilot Run</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Template / Recipe *</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily-sync">Daily System Sync</SelectItem>
                <SelectItem value="backup-routine">Backup Routine</SelectItem>
                <SelectItem value="health-check">Health Check</SelectItem>
                <SelectItem value="deploy-pipeline">Deploy Pipeline</SelectItem>
                <SelectItem value="custom">Custom Recipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="run-name">Run Name *</Label>
            <Input
              id="run-name"
              placeholder="Enter a name for this run..."
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger-mode">Trigger Mode *</Label>
            <Select value={triggerMode} onValueChange={setTriggerMode}>
              <SelectTrigger id="trigger-mode">
                <SelectValue placeholder="Select trigger mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Run Now</SelectItem>
                <SelectItem value="schedule">Schedule for Later</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (devConfig.readonly && true)}
            title={devConfig.readonly ? "Available in Phase 2" : ""}
          >
            {isSubmitting ? "Triggering..." : "Trigger Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
