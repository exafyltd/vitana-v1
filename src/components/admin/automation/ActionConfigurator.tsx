import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Mail, MessageSquare, Bell, Calendar } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface Action {
  type: string;
  config: Record<string, any>;
}

interface ActionConfiguratorProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
}

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_sms", label: "Send SMS", icon: MessageSquare },
  { value: "send_notification", label: "Send Notification", icon: Bell },
  { value: "create_task", label: "Create Task", icon: Calendar },
];

export default function ActionConfigurator({ actions, onChange }: ActionConfiguratorProps) {
  const addAction = () => {
    onChange([...actions, { type: "", config: {} }]);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const updated = actions.map((action, i) => 
      i === index ? { ...action, ...updates } : action
    );
    onChange(updated);
  };

  const updateActionConfig = (index: number, key: string, value: any) => {
    const updated = actions.map((action, i) => 
      i === index ? { ...action, config: { ...action.config, [key]: value } } : action
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.admin.text3ConfigureActions')}</CardTitle>
        <CardDescription>{t('screens.admin.defineWhatHappensWhenAutomationRuns')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">{t('screens.admin.noActionsConfiguredYet')}</p>
            <Button onClick={addAction} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Action
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {actions.map((action, index) => {
              const actionType = ACTION_TYPES.find(t => t.value === action.type);
              const Icon = actionType?.icon;

              return (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      <Label>Action {index + 1}</Label>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('screens.admin.actionType')}</Label>
                    <Select 
                      value={action.type} 
                      onValueChange={(value) => updateAction(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.admin.selectActionType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(type => {
                          const TypeIcon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {action.type === "send_email" && (
                    <>
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input 
                          value={action.config.subject || ""}
                          onChange={(e) => updateActionConfig(index, "subject", e.target.value)}
                          placeholder="Email subject..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea 
                          value={action.config.message || ""}
                          onChange={(e) => updateActionConfig(index, "message", e.target.value)}
                          placeholder="Email content..."
                          rows={4}
                        />
                      </div>
                    </>
                  )}

                  {action.type === "send_notification" && (
                    <>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                          value={action.config.title || ""}
                          onChange={(e) => updateActionConfig(index, "title", e.target.value)}
                          placeholder="Notification title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea 
                          value={action.config.message || ""}
                          onChange={(e) => updateActionConfig(index, "message", e.target.value)}
                          placeholder="Notification message..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <Button onClick={addAction} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Action
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
