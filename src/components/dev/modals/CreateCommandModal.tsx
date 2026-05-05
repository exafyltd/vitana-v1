import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { devConfig } from "@/config/dev-config";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

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
          <DialogTitle>{t('screens.dev.createCommand')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="command-type">{t('screens.dev.commandType')}</Label>
            <Select value={commandType} onValueChange={setCommandType}>
              <SelectTrigger id="command-type">
                <SelectValue placeholder={t('screens.dev.selectCommandType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="restart">{t('screens.dev.restartService')}</SelectItem>
                <SelectItem value="backup">{t('screens.dev.backupData')}</SelectItem>
                <SelectItem value="sync">{t('screens.dev.syncResources')}</SelectItem>
                <SelectItem value="custom">{t('screens.dev.customCommand')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-vtid">{t('screens.dev.targetVtid')}</Label>
            <Input
              id="target-vtid"
              placeholder={t('screens.dev.enterVtid')}
              value={targetVTID}
              onChange={(e) => setTargetVTID(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="schedule-toggle">{t('screens.dev.scheduleForLater')}</Label>
            <Switch
              id="schedule-toggle"
              checked={scheduled}
              onCheckedChange={setScheduled}
            />
          </div>

          {scheduled && (
            <div className="space-y-2">
              <Label htmlFor="schedule-time">{t('screens.dev.scheduleTime')}</Label>
              <Input
                id="schedule-time"
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t('screens.dev.notesOptional')}</Label>
            <Textarea
              id="notes"
              placeholder={t('screens.dev.addAnyAdditionalNotes')}
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
