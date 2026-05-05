import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecipientSelector, RecipientSelection } from "./RecipientSelector";
import { t } from '@/lib/i18n-toast';

const NOTIFICATION_TYPES = [
  { value: "welcome_to_vitana", label: "Welcome / System" },
  { value: "new_recommendation", label: "Recommendation" },
  { value: "meetup_recommended", label: "Meetup" },
  { value: "group_recommended", label: "Community" },
  { value: "daily_diary_reminder", label: "Diary Reminder" },
  { value: "morning_briefing_ready", label: "Morning Briefing" },
  { value: "health_score_improvement", label: "Health Update" },
  { value: "predictive_signal_detected", label: "Signal Alert" },
  { value: "invite_friends_prompt", label: "Growth / Invite" },
  { value: "live_room_starting", label: "Live Room" },
];

const CHANNEL_OPTIONS = [
  { value: "push_and_inapp", label: "Push + In-App" },
  { value: "push", label: "Push Only" },
  { value: "inapp", label: "In-App Only" },
  { value: "silent", label: "Silent (DB only)" },
];

const PRIORITY_OPTIONS = [
  { value: "p0", label: "P0 - Critical (bypasses DND)" },
  { value: "p1", label: "P1 - High" },
  { value: "p2", label: "P2 - Normal" },
  { value: "p3", label: "P3 - Low" },
];

export interface ComposeFormData {
  recipients: RecipientSelection;
  type: string;
  title: string;
  body: string;
  channel: string;
  priority: string;
}

interface NotificationComposerProps {
  onSubmit: (data: ComposeFormData) => Promise<void>;
  sending?: boolean;
  tenantId: string;
  onChange?: (data: ComposeFormData) => void;
}

export function NotificationComposer({
  onSubmit,
  sending = false,
  tenantId,
  onChange,
}: NotificationComposerProps) {
  const [formData, setFormData] = useState<ComposeFormData>({
    recipients: { mode: "all", tenantId },
    type: "welcome_to_vitana",
    title: "",
    body: "",
    channel: "push_and_inapp",
    priority: "p1",
  });

  const update = (partial: Partial<ComposeFormData>) => {
    const next = { ...formData, ...partial };
    setFormData(next);
    onChange?.(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) return;
    await onSubmit(formData);
  };

  const isValid = formData.title.trim() && formData.body.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Recipients */}
      <RecipientSelector
        value={formData.recipients}
        onChange={(recipients) => update({ recipients })}
        tenantId={tenantId}
      />

      {/* Notification type */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('screens.admin.type')}</label>
        <Select value={formData.type} onValueChange={(type) => update({ type })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('screens.admin.title')}</label>
        <Input
          placeholder={t('screens.admin.notificationTitle')}
          value={formData.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">{formData.title.length}/100</p>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t('screens.admin.body')}</label>
        <Textarea
          placeholder={t('screens.admin.writeNotificationMessage')}
          value={formData.body}
          onChange={(e) => update({ body: e.target.value })}
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">{formData.body.length}/500</p>
      </div>

      {/* Channel + Priority row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('screens.admin.channel')}</label>
          <Select value={formData.channel} onValueChange={(channel) => update({ channel })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('screens.admin.priority')}</label>
          <Select value={formData.priority} onValueChange={(priority) => update({ priority })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || sending}
        className="w-full"
        size="lg"
      >
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('screens.admin.sending')}
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            {t('screens.admin.sendNotification')}
          </>
        )}
      </Button>
    </form>
  );
}
