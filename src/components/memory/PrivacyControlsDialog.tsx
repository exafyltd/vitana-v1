import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface PrivacyControlsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrackingSettings {
  chat: boolean;
  memory: boolean;
  wallet: boolean;
  discover: boolean;
  calendar: boolean;
  autopilot: boolean;
  health: boolean;
  community: boolean;
}

export function PrivacyControlsDialog({ open, onOpenChange }: PrivacyControlsDialogProps) {
  const { toast } = useToast();
  const [trackingEnabled, setTrackingEnabled] = useState<TrackingSettings>({
    chat: true,
    memory: true,
    wallet: true,
    discover: true,
    calendar: true,
    autopilot: true,
    health: true,
    community: true,
  });
  const [autoDeleteDays, setAutoDeleteDays] = useState("never");
  const [exportDataOption, setExportDataOption] = useState("encrypted");

  const handleToggleTracking = (category: keyof TrackingSettings) => {
    setTrackingEnabled(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSave = () => {
    notify('toasts.memory.privacySettingsSaved', 'toasts.memory.yourPrivacyPreferencesHaveUpdated');
    onOpenChange(false);
  };

  const categories = [
    { key: "chat" as const, label: "Chat Conversations", emoji: "💬" },
    { key: "memory" as const, label: "Memory & Notes", emoji: "🧠" },
    { key: "wallet" as const, label: "Wallet Transactions", emoji: "💰" },
    { key: "discover" as const, label: "Discover Activity", emoji: "❤️" },
    { key: "calendar" as const, label: "Calendar Events", emoji: "📅" },
    { key: "autopilot" as const, label: "Autopilot Actions", emoji: "🤖" },
    { key: "health" as const, label: "Health Data", emoji: "🩺" },
    { key: "community" as const, label: "Community Interactions", emoji: "👥" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            {t('screens.memory.privacyControls')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Activity Tracking by Category */}
          <div className="space-y-3">
            <h3 className="font-semibold">{t('screens.memory.activityTracking')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('screens.memory.chooseWhichActivitiesTrackYourHistory')}
            </p>
            <div className="space-y-2">
              {categories.map(({ key, label, emoji }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <Label htmlFor={`track-${key}`} className="cursor-pointer">
                      {label}
                    </Label>
                  </div>
                  <Switch
                    id={`track-${key}`}
                    checked={trackingEnabled[key]}
                    onCheckedChange={() => handleToggleTracking(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Delete Settings */}
          <div className="space-y-2">
            <Label htmlFor="auto-delete">{t('screens.memory.automaticDeletion')}</Label>
            <Select value={autoDeleteDays} onValueChange={setAutoDeleteDays}>
              <SelectTrigger id="auto-delete">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t('screens.memory.neverKeepForever')}</SelectItem>
                <SelectItem value="30">{t('screens.memory.after30Days')}</SelectItem>
                <SelectItem value="90">{t('screens.memory.after90Days')}</SelectItem>
                <SelectItem value="180">{t('screens.memory.after180Days')}</SelectItem>
                <SelectItem value="365">{t('screens.memory.after1Year')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('screens.memory.automaticallyDeleteActivityHistoryAfterSpecified')}
            </p>
          </div>

          {/* Data Export Options */}
          <div className="space-y-2">
            <Label htmlFor="export-option">{t('screens.memory.dataExportFormat')}</Label>
            <Select value={exportDataOption} onValueChange={setExportDataOption}>
              <SelectTrigger id="export-option">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encrypted">{t('screens.memory.encryptedRecommended')}</SelectItem>
                <SelectItem value="plain">{t('screens.memory.plainText')}</SelectItem>
                <SelectItem value="json">{t('screens.memory.jsonFormat')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('screens.memory.chooseHowYourDataFormattedWhen')}
            </p>
          </div>

          {/* Warning Box */}
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('screens.memory.privacyNotice')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('screens.memory.disablingActivityTrackingWillPreventCertain')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('screens.memory.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('screens.memory.saveSettings')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}