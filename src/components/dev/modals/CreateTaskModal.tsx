import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { devConfig } from "@/config/dev-config";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTaskModal({ open, onOpenChange, onSuccess }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !priority) {
      notifyError('toasts.dev.pleaseFillAllRequiredFields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    notifySuccess('toasts.dev.taskCreatedSuccessfully');
    onOpenChange(false);
    onSuccess?.();
    
    // Reset form
    setTitle("");
    setDescription("");
    setPriority("");
    setAssignee("");
    setDueDate("");
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{t('screens.dev.createTask')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">{t('screens.dev.title')}</Label>
            <Input
              id="task-title"
              placeholder={t('screens.dev.enterTaskTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">{t('screens.dev.description')}</Label>
            <Textarea
              id="task-description"
              placeholder={t('screens.dev.describeTask')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-priority">{t('screens.dev.priority')}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="task-priority">
                <SelectValue placeholder={t('screens.dev.selectPriority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('screens.dev.high')}</SelectItem>
                <SelectItem value="medium">{t('screens.dev.medium')}</SelectItem>
                <SelectItem value="low">{t('screens.dev.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">{t('screens.dev.assignee')}</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder={t('screens.dev.selectAssignee')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent-1">{t('screens.dev.agentAlpha')}</SelectItem>
                <SelectItem value="agent-2">{t('screens.dev.agentBeta')}</SelectItem>
                <SelectItem value="agent-3">{t('screens.dev.agentGamma')}</SelectItem>
                <SelectItem value="unassigned">{t('screens.dev.unassigned')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">{t('screens.dev.dueDateTime')}</Label>
            <Input
              id="task-due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.dev.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (devConfig.readonly && true)}
            title={devConfig.readonly ? "Available in Phase 2" : ""}
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
