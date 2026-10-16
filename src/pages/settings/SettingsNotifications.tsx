import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/layout/spotlight/Panel";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Moon, MessageSquare, CalendarDays, Users, Lock, ShieldCheck } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useNotificationCategoryPreferences, CategoryPreference } from "@/hooks/useNotificationCategoryPreferences";
import { notify, notifyError, t, useI18nLocale } from '@/lib/i18n-toast';
import { settingsNavigation } from "@/config/navigation";
import { VitanaMessagesSettings } from "@/components/settings/VitanaMessagesSettings";
import { ScreenFrame, SpotlightLoading } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

const TYPE_CONFIG = {
  chat: { labelKey: "screens.settings.notificationsSettingsSection_chat", icon: MessageSquare },
  calendar: { labelKey: "screens.settings.notificationsSettingsSection_calendar", icon: CalendarDays },
  community: { labelKey: "screens.settings.notificationsSettingsSection_community", icon: Users },
} as const;

export default function SettingsNotifications() {
  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below).
  const spotlight = useSpotlightEnabled();
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPreferences();
  const { categories, role, roleNotifications, loading: catLoading, toggleCategory } = useNotificationCategoryPreferences();
  const locale = useI18nLocale();

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
    // VTID-05111 — Spotlight: the form skeleton inside the frame instead of a page spinner (SR-20).
    if (spotlight) {
      return (
        <AppLayout>
          <SEO title={t('screens.settings.notificationsSettings')} description={t('screens.settings.configureYourNotificationPreferences')} canonical={window.location.href} />
          <ScreenFrame
            archetype="form"
            subNav={{ items: settingsNavigation }}
            header={{ title: t('screens.settings.customizeYourAlerts'), description: t('screens.settings.configureYourNotificationPreferences'), emoji: '🔕' }}
          >
            <SpotlightLoading archetype="form" />
            {/* VTID-05100: own query and loading state — never waits for the other preferences. */}
            <VitanaMessagesSettings />
          </ScreenFrame>
        </AppLayout>
      );
    }
    return (
      <AppLayout>
        <SEO title={t('screens.settings.notificationsSettings')} description={t('screens.settings.configureYourNotificationPreferences')} canonical={window.location.href} />
        <SubNavigation items={settingsNavigation} />
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <StandardHeader
              title={t('screens.settings.customizeYourAlerts')}
              description={t('screens.settings.configureYourNotificationPreferences')}
              emoji="🔕"
            />
            <SpotlightLoading archetype="form" />
            {/* VTID-05100: own query and loading state — never waits for the other preferences. */}
            <VitanaMessagesSettings />
          </div>
        </div>
      </AppLayout>
    );
  }

  const notificationSettings = (
    <>
      {/* Push Notifications (Global) */}
      <Panel>
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {t('screens.settings.pushNotifications')}
          </PanelTitle>
        </PanelHeader>
        <PanelContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{t('screens.settings.enablePushNotifications')}</h4>
              <p className="text-sm text-muted-foreground">{t('screens.settings.receiveNotificationsYourDevice')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('notificationControls.member.pushHint')}</p>
            </div>
            <Switch
              checked={prefs.push_enabled}
              onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
            />
          </div>
        </PanelContent>
      </Panel>

      {/* Dynamic Category Sections (Chat, Calendar, Community) */}
      {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        const items = categories?.[type] || [];

        if (items.length === 0) return null;

        return (
          <Panel key={type}>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {t(config.labelKey)}
              </PanelTitle>
            </PanelHeader>
            <PanelContent className="space-y-6">
              {items.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between gap-4" data-testid={`member-category-${cat.slug}`}>
                  <div>
                    <h4 className="font-medium">{cat.display_name}</h4>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    )}
                    {cat.locked && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {t('notificationControls.member.alwaysOn')}
                      </p>
                    )}
                  </div>
                  {/* VTID-04676: a category decides in-app AND push, so it stays switchable with push off. */}
                  <Switch
                    checked={cat.locked ? true : cat.enabled}
                    onCheckedChange={() => handleCategoryToggle(cat)}
                    disabled={!!cat.locked}
                    aria-label={cat.display_name}
                  />
                </div>
              ))}
            </PanelContent>
          </Panel>
        );
      })}

      {/* VTID-05100: Vitana's proactive personal Messenger messages */}
      <VitanaMessagesSettings />

      {/* VTID-04676: notifications the caller's role receives (admin / developer / staff) */}
      {role && roleNotifications.length > 0 && (
        <Panel data-testid="role-notifications">
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              {t(`notificationControls.member.roleTitle.${role}`)}
            </PanelTitle>
            <p className="text-sm text-muted-foreground">{t('notificationControls.member.roleHint')}</p>
          </PanelHeader>
          <PanelContent className="space-y-4">
            {roleNotifications.map((n) => (
              <div key={n.type}>
                <h4 className="font-medium">{locale.toLowerCase().startsWith('de') ? n.label.de : n.label.en}</h4>
                <p className="text-sm text-muted-foreground">{locale.toLowerCase().startsWith('de') ? n.description.de : n.description.en}</p>
              </div>
            ))}
          </PanelContent>
        </Panel>
      )}

      {/* Quiet Hours */}
      <Panel>
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            {t('screens.settings.quietHours')}
          </PanelTitle>
        </PanelHeader>
        <PanelContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{t('screens.settings.enableQuietHours')}</h4>
              <p className="text-sm text-muted-foreground">{t('screens.settings.pauseNonurgentNotificationsDuringSpecifiedTimes')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('notificationControls.member.quietHoursHint')}</p>
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
        </PanelContent>
      </Panel>
    </>
  );

  // VTID-05111 — Spotlight Tier B: same content inside ScreenFrame (archetype from the manifest).
  if (spotlight) {
    return (
      <AppLayout>
        <SEO title={t('screens.settings.notificationsSettings')} description={t('screens.settings.configureYourNotificationPreferences')} canonical={window.location.href} />
        <ScreenFrame
          archetype="form"
          subNav={{ items: settingsNavigation }}
          header={{ title: t('screens.settings.customizeYourAlerts'), description: t('screens.settings.configureYourNotificationPreferences'), emoji: '🔕' }}
        >
          <div className="flex flex-col gap-6">{notificationSettings}</div>
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.settings.notificationsSettings')} description={t('screens.settings.configureYourNotificationPreferences')} canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
        <StandardHeader
          title={t('screens.settings.customizeYourAlerts')}
          description={t('screens.settings.configureYourNotificationPreferences')}
          emoji="🔕"
        />

        <SpotlightLoading loading={false}>
          <div className="space-y-6">{notificationSettings}</div>
        </SpotlightLoading>
        </div>
      </div>
    </AppLayout>
  );
}
