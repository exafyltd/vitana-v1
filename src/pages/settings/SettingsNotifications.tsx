import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Smartphone, Moon } from "lucide-react";
import { useNotificationSettings, type NotificationSettings } from "@/hooks/useMessageNotifications";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

export default function SettingsNotifications() {
  const { getNotificationSettings, updateNotificationSettings } = useNotificationSettings();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    
    try {
      await updateNotificationSettings({ [field]: value });
      setSettings({ ...settings, [field]: value });
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  };

  const handleTimeChange = async (field: 'dnd_start_time' | 'dnd_end_time', value: string) => {
    if (!settings) return;
    
    try {
      await updateNotificationSettings({ [field]: value });
      setSettings({ ...settings, [field]: value });
      toast({
        title: "Settings updated",
        description: "Your quiet hours have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quiet hours",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <SEO title="Notifications | Settings" description="Configure your notification preferences" canonical={window.location.href} />
        <SubNavigation items={settingsSubItems} />
        <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!settings) {
    return (
      <AppLayout>
        <SEO title="Notifications | Settings" description="Configure your notification preferences" canonical={window.location.href} />
        <SubNavigation items={settingsSubItems} />
        <div className="p-6 max-w-4xl mx-auto">
          <p className="text-center text-muted-foreground">Failed to load settings. Please try again.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Notifications | Settings" description="Configure your notification preferences" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <StandardHeader 
          title="Customize your alerts!"
          description="Configure your notification preferences"
          emoji="🔕"
        />
        
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Community Events</h4>
                <p className="text-sm text-muted-foreground">Get notified about new events and meetups</p>
              </div>
              <Switch 
                checked={settings.email_events} 
                onCheckedChange={(checked) => handleToggle('email_events', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Appointment Reminders</h4>
                <p className="text-sm text-muted-foreground">Reminders for upcoming appointments</p>
              </div>
              <Switch 
                checked={settings.email_appointments} 
                onCheckedChange={(checked) => handleToggle('email_appointments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">AI Tips & Insights</h4>
                <p className="text-sm text-muted-foreground">Personalized health and wellness tips</p>
              </div>
              <Switch 
                checked={settings.email_ai_tips} 
                onCheckedChange={(checked) => handleToggle('email_ai_tips', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Weekly Reports</h4>
                <p className="text-sm text-muted-foreground">Summary of your weekly progress</p>
              </div>
              <Switch 
                checked={settings.email_weekly_reports} 
                onCheckedChange={(checked) => handleToggle('email_weekly_reports', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Group Messages</h4>
                <p className="text-sm text-muted-foreground">New messages in your groups</p>
              </div>
              <Switch 
                checked={settings.push_group_messages} 
                onCheckedChange={(checked) => handleToggle('push_group_messages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Goal Reminders</h4>
                <p className="text-sm text-muted-foreground">Daily reminders for your wellness goals</p>
              </div>
              <Switch 
                checked={settings.push_goal_reminders} 
                onCheckedChange={(checked) => handleToggle('push_goal_reminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Friend Activity</h4>
                <p className="text-sm text-muted-foreground">When friends complete challenges or milestones</p>
              </div>
              <Switch 
                checked={settings.push_friend_activity} 
                onCheckedChange={(checked) => handleToggle('push_friend_activity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Breaking News</h4>
                <p className="text-sm text-muted-foreground">Important health and wellness updates</p>
              </div>
              <Switch 
                checked={settings.push_breaking_news} 
                onCheckedChange={(checked) => handleToggle('push_breaking_news', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              In-App Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Real-time Messages</h4>
                <p className="text-sm text-muted-foreground">Show message notifications while using the app</p>
              </div>
              <Switch 
                checked={settings.inapp_messages} 
                onCheckedChange={(checked) => handleToggle('inapp_messages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">System Updates</h4>
                <p className="text-sm text-muted-foreground">App updates and maintenance notifications</p>
              </div>
              <Switch 
                checked={settings.inapp_system} 
                onCheckedChange={(checked) => handleToggle('inapp_system', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Achievement Alerts</h4>
                <p className="text-sm text-muted-foreground">Celebrate when you reach milestones</p>
              </div>
              <Switch 
                checked={settings.inapp_achievements} 
                onCheckedChange={(checked) => handleToggle('inapp_achievements', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Quiet Hours</h4>
                <p className="text-sm text-muted-foreground">Pause non-urgent notifications during specified times</p>
              </div>
              <Switch 
                checked={settings.dnd_enabled} 
                onCheckedChange={(checked) => handleToggle('dnd_enabled', checked)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Select 
                  value={settings.dnd_start_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_start_time', value)}
                  disabled={!settings.dnd_enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                    <SelectItem value="23:00">11:00 PM</SelectItem>
                    <SelectItem value="00:00">12:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Time</label>
                <Select 
                  value={settings.dnd_end_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_end_time', value)}
                  disabled={!settings.dnd_enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="05:00">5:00 AM</SelectItem>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}