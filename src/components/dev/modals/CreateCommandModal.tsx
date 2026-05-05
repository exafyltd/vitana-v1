import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { devConfig } from "@/config/dev-config";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

interface CreateCommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCommandModal({ open, onOpenChange, onSuccess }: CreateCommandModalProps) {
  const [commandType, setCommandType] = useState("");
  const [targetVTID, setTargetVTID] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!commandType || !targetVTID) {
      notifyError('toasts.dev.pleaseFillAllRequiredFields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    notifySuccess('toasts.dev.commandCreatedSuccessfully');
    onOpenChange(false);
    onSuccess?.();
    
    // Reset form
    setCommandType("");
    setTargetVTID("");
    setScheduled(false);
    setScheduleTime("");
    setNotes("");
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Create Command</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="command-type">Command Type *</Label>
            <Select value={commandType} onValueChange={setCommandType}>
              <SelectTrigger id="command-type">
                <SelectValue placeholder="Select command type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="restart">Restart Service</SelectItem>
                <SelectItem value="backup">Backup Data</SelectItem>
                <SelectItem value="sync">Sync Resources</SelectItem>
                <SelectItem value="custom">Custom Command</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-vtid">Target VTID *</Label>
            <Input
              id="target-vtid"
              placeholder="Enter VTID..."
              value={targetVTID}
              onChange={(e) => setTargetVTID(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="schedule-toggle">Schedule for later</Label>
            <Switch
              id="schedule-toggle"
              checked={scheduled}
              onCheckedChange={setScheduled}
            />
          </div>

          {scheduled && (
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Schedule Time</Label>
              <Input
                id="schedule-time"
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
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
            {isSubmitting ? "Creating..." : "Run Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
