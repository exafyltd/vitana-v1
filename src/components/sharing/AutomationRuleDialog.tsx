import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

interface AutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutomationRuleDialog({ open, onOpenChange }: AutomationRuleDialogProps) {
  const { createRule } = useAutomationRules();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"schedule" | "event" | "condition">("schedule");
  const [actionType, setActionType] = useState<"publish" | "notify" | "update">("publish");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await createRule.mutateAsync({
      user_id: user.id,
      name,
      description,
      trigger_type: triggerType,
      action_type: actionType,
      trigger_config: {},
      action_config: {},
      is_active: true,
    });

    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.sharing.createAutomationRule')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rule-name">{t('screens.sharing.ruleName')}</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Auto-publish on schedule"
              required
            />
          </div>
          <div>
            <Label htmlFor="rule-description">{t('screens.sharing.description')}</Label>
            <Textarea
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule does..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="trigger">{t('screens.sharing.triggerType')}</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
              <SelectTrigger id="trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">{t('screens.sharing.schedule')}</SelectItem>
                <SelectItem value="event">{t('screens.sharing.event')}</SelectItem>
                <SelectItem value="condition">{t('screens.sharing.condition')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="action">{t('screens.sharing.actionType')}</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publish">{t('screens.sharing.publishPost')}</SelectItem>
                <SelectItem value="notify">{t('screens.sharing.sendNotification')}</SelectItem>
                <SelectItem value="update">{t('screens.sharing.updateStatus')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('screens.sharing.cancel')}
            </Button>
            <Button type="submit" disabled={createRule.isPending}>
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
