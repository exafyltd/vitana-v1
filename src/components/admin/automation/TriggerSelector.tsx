import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Calendar, MessageSquare, User, Activity, Heart } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const TRIGGER_TYPES = [
  { value: "user_signup", label: "User Signs Up", icon: User, description: "When a new user creates an account" },
  { value: "message_received", label: "Message Received", icon: MessageSquare, description: "When a user receives a message" },
  { value: "appointment_scheduled", label: "Appointment Scheduled", icon: Calendar, description: "When an appointment is booked" },
  { value: "health_metric_updated", label: "Health Metric Updated", icon: Heart, description: "When health data is logged" },
  { value: "user_inactive", label: "User Inactive", icon: Activity, description: "When user hasn't been active" },
  { value: "notification_sent", label: "Notification Sent", icon: Bell, description: "When a notification is delivered" },
];

interface TriggerSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TriggerSelector({ value, onChange }: TriggerSelectorProps) {
  const selectedTrigger = TRIGGER_TYPES.find(t => t.value === value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.admin.text1SelectTrigger')}</CardTitle>
        <CardDescription>{t('screens.admin.chooseWhatEventStartsThisAutomation')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('screens.admin.triggerEvent')}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('screens.admin.selectTriggerEvent')} />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map(trigger => {
                const Icon = trigger.icon;
                return (
                  <SelectItem key={trigger.value} value={trigger.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{trigger.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedTrigger && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <selectedTrigger.icon className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">{selectedTrigger.label}</p>
                <p className="text-sm text-muted-foreground">{selectedTrigger.description}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
