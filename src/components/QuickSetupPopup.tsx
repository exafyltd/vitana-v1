import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Shield, Bell, Globe, Check } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface QuickSetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSetupPopup({ isOpen, onClose }: QuickSetupPopupProps) {
  const [setupSettings, setSetupSettings] = useState({
    notifications: true,
    privacy: false,
    autoSync: true,
    analytics: false,
  });

  const handleToggle = (setting: keyof typeof setupSettings) => {
    setSetupSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleApplySettings = () => {
    // Apply settings logic here
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {t('screens.common.quickSetupWizard')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-muted-foreground">
            {t('screens.common.configureMostImportantSettingsQuicklyGet')}
          </p>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-4 h-4" />
                  {t('screens.common.notifications')}
                  <Badge variant="outline" className="ml-auto">{t('screens.common.recommended')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.getNotifiedAboutImportantUpdatesHealth')}
                    </p>
                  </div>
                  <Switch
                    checked={setupSettings.notifications}
                    onCheckedChange={() => handleToggle('notifications')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-4 h-4" />
                  {t('screens.common.privacyProtection')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.enableEnhancedPrivacyModeLimitData')}
                    </p>
                  </div>
                  <Switch
                    checked={setupSettings.privacy}
                    onCheckedChange={() => handleToggle('privacy')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4" />
                  {t('screens.common.autosyncData')}
                  <Badge variant="outline" className="ml-auto">{t('screens.common.recommended')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('screens.common.automaticallySyncHealthDataFromConnected')}
                    </p>
                  </div>
                  <Switch
                    checked={setupSettings.autoSync}
                    onCheckedChange={() => handleToggle('autoSync')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Check className="w-4 h-4" />
                  {t('screens.common.anonymousAnalytics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.helpImprovePlatformBySharingAnonymous')}
                    </p>
                  </div>
                  <Switch
                    checked={setupSettings.analytics}
                    onCheckedChange={() => handleToggle('analytics')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.common.skipSetup')}
            </Button>
            <Button onClick={handleApplySettings} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              {t('screens.common.applySettings')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}