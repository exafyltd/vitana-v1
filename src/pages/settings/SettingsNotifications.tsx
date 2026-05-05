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
import { notify, notifyError, t } from '@/lib/i18n-toast';

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
      notify('toasts.settings.settingsUpdated2', 'toasts.settings.yourNotificationPreferencesHaveSaved2');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateSettings');
    }
  };

  const handleCategoryToggle = async (cat: CategoryPreference) => {
    try {
      await toggleCategory(cat.id, !cat.enabled);
      notify('toasts.settings.settingsUpdated2');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateSettings');
    }
  };

  const handleTimeChange = async (field: 'dnd_start_time' | 'dnd_end_time', value: string) => {
    try {
      await updatePref(field, value);
      notify('toasts.settings.settingsUpdated2', 'toasts.settings.yourQuietHoursHaveUpdated');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateQuietHours');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <SEO title={t('screens.settings.notificationsSettings')} description="Configure your notification preferences" canonical={window.location.href} />
        <SubNavigation items={settingsSubItems} />
        <div className="p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.settings.notificationsSettings')} description="Configure your notification preferences" canonical={window.location.href} />
      <SubNavigation items={settingsSubItems} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <StandardHeader
          title={t('screens.settings.customizeYourAlerts')}
          description="Configure your notification preferences"
          emoji="🔕"
        />

        {/* Push Notifications (Global) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              {t('screens.settings.pushNotifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{t('screens.settings.enablePushNotifications')}</h4>
                <p className="text-sm text-muted-foreground">{t('screens.settings.receiveNotificationsYourDevice')}</p>
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
              {t('screens.settings.quietHours')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{t('screens.settings.enableQuietHours')}</h4>
                <p className="text-sm text-muted-foreground">{t('screens.settings.pauseNonurgentNotificationsDuringSpecifiedTimes')}</p>
              </div>
              <Switch
                checked={prefs.dnd_enabled}
                onCheckedChange={(checked) => handleToggle('dnd_enabled', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('screens.settings.startTime')}</label>
                <Select
                  value={prefs.dnd_start_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_start_time', value)}
                  disabled={!prefs.dnd_enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.settings.selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20:00">{t('screens.settings.text800Pm')}</SelectItem>
                    <SelectItem value="21:00">{t('screens.settings.text900Pm')}</SelectItem>
                    <SelectItem value="22:00">{t('screens.settings.text1000Pm')}</SelectItem>
                    <SelectItem value="23:00">{t('screens.settings.text1100Pm')}</SelectItem>
                    <SelectItem value="00:00">{t('screens.settings.text1200Am')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('screens.settings.endTime')}</label>
                <Select
                  value={prefs.dnd_end_time || undefined}
                  onValueChange={(value) => handleTimeChange('dnd_end_time', value)}
                  disabled={!prefs.dnd_enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.settings.selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="05:00">{t('screens.settings.text500Am')}</SelectItem>
                    <SelectItem value="06:00">{t('screens.settings.text600Am')}</SelectItem>
                    <SelectItem value="07:00">{t('screens.settings.text700Am')}</SelectItem>
                    <SelectItem value="08:00">{t('screens.settings.text800Am')}</SelectItem>
                    <SelectItem value="09:00">{t('screens.settings.text900Am')}</SelectItem>
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
