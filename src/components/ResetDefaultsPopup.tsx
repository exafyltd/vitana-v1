import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, AlertTriangle, Settings, Bell, Palette, Globe } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ResetDefaultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetDefaultsPopup({ isOpen, onClose }: ResetDefaultsPopupProps) {
  const [resetOptions, setResetOptions] = useState({
    notifications: false,
    appearance: false,
    privacy: false,
    language: false,
    all: false,
  });

  const handleToggle = (option: keyof typeof resetOptions) => {
    if (option === 'all') {
      const newValue = !resetOptions.all;
      setResetOptions({
        notifications: newValue,
        appearance: newValue,
        privacy: newValue,
        language: newValue,
        all: newValue,
      });
    } else {
      setResetOptions(prev => {
        const newState = { ...prev, [option]: !prev[option] };
        newState.all = newState.notifications && newState.appearance && newState.privacy && newState.language;
        return newState;
      });
    }
  };

  const handleReset = () => {
    // Reset settings logic here
    onClose();
  };

  const hasSelections = Object.values(resetOptions).some(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            {t('screens.common.resetDefaults')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">{t('screens.common.warning')}</h4>
              <p className="text-sm text-orange-800">
                {t('screens.common.resettingPreferencesWillPermanentlyRemoveYour')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all"
                checked={resetOptions.all}
                onCheckedChange={() => handleToggle('all')}
              />
              <label htmlFor="all" className="text-sm font-medium cursor-pointer">
                {t('screens.common.resetAllPreferencesFactoryDefaults')}
              </label>
            </div>

            <div className="ml-6 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="w-4 h-4" />
                    {t('screens.common.notificationPreferences')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.resetNotificationSettingsEmailPreferencesAlert')}
                    </p>
                    <Checkbox
                      checked={resetOptions.notifications}
                      onCheckedChange={() => handleToggle('notifications')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="w-4 h-4" />
                    {t('screens.common.appearanceTheme')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.resetThemeColorsLayoutPreferencesAccessibility')}
                    </p>
                    <Checkbox
                      checked={resetOptions.appearance}
                      onCheckedChange={() => handleToggle('appearance')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="w-4 h-4" />
                    {t('screens.common.privacySettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.resetDataSharingVisibilitySecurityPreferences')}
                    </p>
                    <Checkbox
                      checked={resetOptions.privacy}
                      onCheckedChange={() => handleToggle('privacy')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="w-4 h-4" />
                    {t('screens.common.languageRegion')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.resetLanguageTimezoneDateFormatRegional')}
                    </p>
                    <Checkbox
                      checked={resetOptions.language}
                      onCheckedChange={() => handleToggle('language')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReset} 
              className="flex-1"
              disabled={!hasSelections}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('screens.common.resetSelected')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}