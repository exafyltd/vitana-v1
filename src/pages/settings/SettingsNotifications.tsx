import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Moon, MessageSquare, CalendarDays, Users, Loader2 } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useNotificationCategoryPreferences, CategoryPreference } from "@/hooks/useNotificationCategoryPreferences";
import { toast } from "@/hooks/use-toast";

const settingsSubItems = [
  { id: "overview", name: "Overview", path: "/settings" },
  { id: "privacy", name: "Privacy", path: "/settings/privacy" },
  { id: "notifications", name: "Notifications", path: "/settings/notifications" },
  { id: "preferences", name: "Preferences", path: "/settings/preferences" },
  { id: "connected-apps", name: "Connected Apps", path: "/settings/connected-apps" },
  { id: "billing", name: "Billing", path: "/settings/billing" },
  { id: "support", name: "Support", path: "/settings/support" },
];

const TYPE_CONFIG = {
  chat: { label: "Chat", icon: MessageSquare },
  calendar: { label: "Calendar", icon: CalendarDays },
  community: { label: "Community", icon: Users },
} as const;

export default function SettingsNotifications() {
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences();
  const { categories, loading: catLoading, toggleCategory } = useNotificationCategoryPreferences();

  const loading = prefsLoading || catLoading;

  const handleToggle = async (field: keyof typeof prefs, value: boolean) => {
    try {
      await updatePref(field, value);
      toast({ title: "Settings updated", description: "Your notification preferences have been saved" });
    } catch {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleCategoryToggle = async (cat: CategoryPreference) => {
    try {
      await toggleCategory(cat.id, !cat.enabled);
      toast({
        title: "Settings updated",
        description: `${cat.display_name} notifications ${cat.enabled ? "disabled" : "enabled"}`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const handleTimeChange = async (field: 'dnd_start_time' | 'dnd_end_time', value: string) => {
    try {
      await updatePref(field, value);
      toast({ title: "Settings updated", description: "Your quiet hours have been updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update quiet hours", variant: "destructive" });
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

        {/* Push Notifications (Global) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Push Notifications</h4>
                <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
              </div>
              <Switch
                checked={prefs.push_enabled}
                onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Category Sections (Chat, Calendar, Community) */}
        {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          const items = categories?.[type] || [];

          if (items.length === 0) return null;

          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{cat.display_name}</h4>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground">{cat.description}</p>
                      )}
                    </div>
                    <Switch
                      checked={cat.enabled}
                      onCheckedChange={() => handleCategoryToggle(cat)}
                      disabled={!prefs.push_enabled}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

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
                checked={prefs.dnd_enabled}
                onCheckedChange={(checked) => handleToggle('dnd_enabled', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Select
                  value={prefs.dnd_start_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_start_time', value)}
                  disabled={!prefs.dnd_enabled}
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
                  value={prefs.dnd_end_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_end_time', value)}
                  disabled={!prefs.dnd_enabled}
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
