import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive } from "lucide-react";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface ArchiveSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveSettingsDialog({ open, onOpenChange }: ArchiveSettingsDialogProps) {
  const { toast } = useToast();
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(false);
  const [archiveThreshold, setArchiveThreshold] = useState("90");
  const [showArchivedInViews, setShowArchivedInViews] = useState(true);

  const handleSave = () => {
    notify('toasts.memory.settingsSaved', 'toasts.memory.archiveSettingsHaveUpdatedSuccessfully');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Archive className="w-6 h-6" />
            {t('screens.memory.archiveSettings')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-Archive Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="auto-archive" className="text-base font-medium">
                {t('screens.memory.enableAutoarchive')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('screens.memory.automaticallyArchiveOldActivityItemsBased')}
              </p>
            </div>
            <Switch
              id="auto-archive"
              checked={autoArchiveEnabled}
              onCheckedChange={setAutoArchiveEnabled}
            />
          </div>

          {/* Archive Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">{t('screens.memory.archiveAfter')}</Label>
            <Select 
              value={archiveThreshold} 
              onValueChange={setArchiveThreshold}
              disabled={!autoArchiveEnabled}
            >
              <SelectTrigger id="threshold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t('screens.memory.text30Days')}</SelectItem>
                <SelectItem value="60">{t('screens.memory.text60Days')}</SelectItem>
                <SelectItem value="90">{t('screens.memory.text90Days')}</SelectItem>
                <SelectItem value="180">{t('screens.memory.text180Days')}</SelectItem>
                <SelectItem value="365">{t('screens.memory.text1Year')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('screens.memory.itemsOlderThanThisWillAutomatically')}
            </p>
          </div>

          {/* Show Archived Toggle */}
          <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor="show-archived" className="text-base font-medium">
                {t('screens.memory.showArchivedItems')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('screens.memory.includeArchivedItemsTimelineViews')}
              </p>
            </div>
            <Switch
              id="show-archived"
              checked={showArchivedInViews}
              onCheckedChange={setShowArchivedInViews}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{t('screens.memory.note')}</strong>{t('screens.memory.archivedItemsHiddenFromRegularViews')}
            </p>
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