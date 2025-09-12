import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Shield, Bell, Globe, Check } from "lucide-react";

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
            Quick Setup Wizard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Configure the most important settings quickly to get started with your personalized experience.
          </p>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-4 h-4" />
                  Notifications
                  <Badge variant="outline" className="ml-auto">Recommended</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Get notified about important updates, health reminders, and community activity
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
                  Privacy Protection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Enable enhanced privacy mode and limit data sharing
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
                  Auto-Sync Data
                  <Badge variant="outline" className="ml-auto">Recommended</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync health data from connected devices and apps
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
                  Anonymous Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Help improve the platform by sharing anonymous usage data
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
              Skip Setup
            </Button>
            <Button onClick={handleApplySettings} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Apply Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}