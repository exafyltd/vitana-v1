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
import { notify } from '@/lib/i18n-toast';

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
          <ResponsiveDialogTitle>Privacy Settings</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Configure global privacy controls and data handling policies
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogBody>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="dataRetention">Data Retention Period</Label>
                <Select value={dataRetention} onValueChange={setDataRetention}>
                  <SelectTrigger id="dataRetention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 Days</SelectItem>
                    <SelectItem value="90days">90 Days</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="indefinite">Indefinite</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long to keep data before automatic deletion
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultConsent">Default Consent Level</Label>
                <Select value={defaultConsent} onValueChange={setDefaultConsent}>
                  <SelectTrigger id="defaultConsent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opt-in">Opt-in (Explicit consent required)</SelectItem>
                    <SelectItem value="opt-out">Opt-out (Consent assumed)</SelectItem>
                    <SelectItem value="informed">Informed consent only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default permission model for new access requests
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="thirdPartySharing">Third-Party Data Sharing</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow sharing data with external partners
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
                    <Label htmlFor="autoExportRequests">Auto-process Export Requests</Label>
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
                    <Label htmlFor="activityLogging">Access Activity Logging</Label>
                    <p className="text-xs text-muted-foreground">
                      Track who accessed your data and when
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
              Cancel
            </Button>
            <Button type="submit">Save Settings</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
