import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { notify, t } from '@/lib/i18n-toast';

interface PrivacySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacySettingsDialog({ open, onOpenChange }: PrivacySettingsDialogProps) {
  const [dataRetention, setDataRetention] = React.useState("90days");
  const [defaultConsent, setDefaultConsent] = React.useState("opt-in");
  const [thirdPartySharing, setThirdPartySharing] = React.useState(false);
  const [autoExportRequests, setAutoExportRequests] = React.useState(true);
  const [activityLogging, setActivityLogging] = React.useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    notify('toasts.sharing.privacySettingsUpdated', 'toasts.sharing.yourGlobalPrivacyControlsHaveSaved');
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[550px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.sharing.privacySettings')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('screens.sharing.configureGlobalPrivacyControlsDataHandling')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogBody>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="dataRetention">{t('screens.sharing.dataRetentionPeriod')}</Label>
                <Select value={dataRetention} onValueChange={setDataRetention}>
                  <SelectTrigger id="dataRetention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">{t('screens.sharing.text30Days')}</SelectItem>
                    <SelectItem value="90days">{t('screens.sharing.text90Days')}</SelectItem>
                    <SelectItem value="1year">{t('screens.sharing.text1Year')}</SelectItem>
                    <SelectItem value="2years">{t('screens.sharing.text2Years')}</SelectItem>
                    <SelectItem value="indefinite">{t('screens.sharing.indefinite')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('screens.sharing.howLongKeepDataBeforeAutomatic')}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultConsent">{t('screens.sharing.defaultConsentLevel')}</Label>
                <Select value={defaultConsent} onValueChange={setDefaultConsent}>
                  <SelectTrigger id="defaultConsent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opt-in">{t('screens.sharing.optinExplicitConsentRequired')}</SelectItem>
                    <SelectItem value="opt-out">{t('screens.sharing.optoutConsentAssumed')}</SelectItem>
                    <SelectItem value="informed">{t('screens.sharing.informedConsentOnly')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default permission model for new access requests
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="thirdPartySharing">{t('screens.sharing.thirdpartyDataSharing')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('screens.sharing.allowSharingDataWithExternalPartners')}
                    </p>
                  </div>
                  <Switch
                    id="thirdPartySharing"
                    checked={thirdPartySharing}
                    onCheckedChange={setThirdPartySharing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoExportRequests">{t('screens.sharing.autoprocessExportRequests')}</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically fulfill data export requests
                    </p>
                  </div>
                  <Switch
                    id="autoExportRequests"
                    checked={autoExportRequests}
                    onCheckedChange={setAutoExportRequests}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="activityLogging">{t('screens.sharing.accessActivityLogging')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('screens.sharing.trackWhoAccessedYourDataWhen')}
                    </p>
                  </div>
                  <Switch
                    id="activityLogging"
                    checked={activityLogging}
                    onCheckedChange={setActivityLogging}
                  />
                </div>
              </div>
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('screens.sharing.cancel')}
            </Button>
            <Button type="submit">{t('screens.sharing.saveSettings')}</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
