import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings as SettingsIcon, Shield, Bell, Smartphone, CreditCard, HelpCircle, Users, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRTL } from "@/components/RTLProvider";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { QuickSetupPopup } from "@/components/QuickSetupPopup";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { useNotificationPreferences, NotificationPreferences } from "@/hooks/useNotifications";
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from "@/hooks/useTranslation";
import { notify, notifyError, t } from '@/lib/i18n-toast';

function Settings() {
  const navigate = useNavigate();
  const { isRTL, toggleRTL } = useRTL();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'notifications' ? 'categories' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { toast } = useToast();
  const { prefs: notificationPrefs, loading: loadingSettings, updatePref } = useNotificationPreferences();
  const { translate } = useTranslation();


  // Handler to update a notification preference
  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await updatePref(key, value);
      notify('toasts.settings.settingsUpdated', 'toasts.settings.yourNotificationPreferencesHaveSaved');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateSettings');
    }
  };

  // Handler to update time settings
  const handleTimeChange = async (key: 'dnd_start_time' | 'dnd_end_time', value: string) => {
    try {
      await updatePref(key, value);
      notify('toasts.settings.settingsUpdated', 'toasts.settings.yourQuietHoursHaveSaved');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateQuietHours');
    }
  };
  const categoryCards = [
    {
      id: "privacy",
      title: "Privacy",
      description: "Control your data and privacy settings",
      icon: Shield,
      path: "/settings/privacy",
      color: "from-red-100 to-pink-100"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage your notification preferences",
      icon: Bell,
      path: "/settings/notifications",
      color: "from-blue-100 to-indigo-100"
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Customize your app experience",
      icon: SettingsIcon,
      path: "/settings/preferences",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "connected-apps",
      title: "Connected Apps & Integrations",
      description: "Manage your connected applications",
      icon: Smartphone,
      path: "/settings/connected-apps",
      color: "from-purple-100 to-violet-100"
    },
    {
      id: "tenant-role",
      title: "Tenant & Role Switcher",
      description: "Switch between roles and tenants",
      icon: Users,
      path: "/settings/tenant-role",
      color: "from-indigo-100 to-blue-100"
    },
    {
      id: "billing",
      title: "Billing",
      description: "Manage your subscription and payments",
      icon: CreditCard,
      path: "/settings/billing",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "support",
      title: "Support",
      description: "Get help and contact support",
      icon: HelpCircle,
      path: "/settings/support",
      color: "from-cyan-100 to-teal-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.settings.settings')} description="Manage your account settings, privacy, and preferences" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.settings.settingsOverview')}
            emoji="⚙️"
            description="Manage your account settings, privacy, and preferences to personalize your wellness journey"
          />

          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton placeholder={translate('settings.searchPlaceholder', 'Search settings, privacy controls, integrations...')} />
              <UniversalCalendarButton />
              <Button size="sm" onClick={() => setActionPopupOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Quick Setup
              </Button>
            </div>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="overview">{t('screens.settings.overview')}</SplitBarTrigger>
              <SplitBarTrigger value="categories">{t('screens.settings.notifications')}</SplitBarTrigger>
              <SplitBarTrigger value="shortcuts">{t('screens.settings.quickActions')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.settingsOverview')}
                    subtitle="Your Account Status"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-600">Protected</div>
                            <div className="text-xs text-muted-foreground">{t('screens.settings.privacyStatus')}</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">Premium</div>
                            <div className="text-xs text-muted-foreground">Subscription</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>{t('screens.settings.notificationsActive')}</span>
                            <span className="text-blue-600">{t('screens.settings.text5Types')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('screens.settings.connectedApps')}</span>
                            <span className="text-green-600">{t('screens.settings.text3Apps')}</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.privacyScore')}
                    subtitle="Protection Level"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">95%</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.excellentSecurity')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.activeSettings')}
                    subtitle="Configured"
                    icon={Bell}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">12</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.settingsConfigured')}</div>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="encouragement" />
                </div>

                {/* Row 3: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.connectedApps')}
                    subtitle="Integrations"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">3</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.activeConnections')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title={t('screens.settings.billingStatus')}
                    subtitle="Subscription"
                    icon={CreditCard}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-orange-600">Active</div>
                        <div className="text-xs text-muted-foreground">{t('screens.settings.untilDec2024')}</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title={t('screens.settings.recentSettingsActivity')}
                    subtitle="Latest Changes"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{t('screens.settings.privacySettingsUpdated2DaysAgo')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{t('screens.settings.connectedNewFitnessApp1Week')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{t('screens.settings.notificationPreferencesSaved')}</span>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="categories">
              <div className="grid grid-cols-12 gap-4">
                {/* Push Notifications (Global) */}
                <div className="col-span-12">
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
                          <h4 className="font-medium">{t('screens.settings.enablePushNotifications')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.receiveNotificationsYourDevice')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.push_enabled}
                          onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Live Rooms */}
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Live Rooms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{t('screens.settings.liveRoomNotifications')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.roomStartingInvitesSummaries')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.live_room_notifications}
                          onCheckedChange={(checked) => handleToggle('live_room_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Social & Community */}
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Social & Community
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{t('screens.settings.matchNotifications')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.newMatchesAcceptedMatchesSuggestions')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.match_notifications}
                          onCheckedChange={(checked) => handleToggle('match_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{t('screens.settings.communityNotifications')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.groupsMeetupsCommunityActivity')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.community_notifications}
                          onCheckedChange={(checked) => handleToggle('community_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Intelligence */}
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Intelligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Recommendations</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.aiRecommendationsSuggestions')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.recommendation_notifications}
                          onCheckedChange={(checked) => handleToggle('recommendation_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{t('screens.settings.taskNotifications')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.taskUpdatesReminders')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.task_notifications}
                          onCheckedChange={(checked) => handleToggle('task_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{t('screens.settings.memoryDiary')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.diaryRemindersMemoryUpdates')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.memory_notifications}
                          onCheckedChange={(checked) => handleToggle('memory_notifications', checked)}
                          disabled={loadingSettings || !notificationPrefs.push_enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quiet Hours */}
                <div className="col-span-12">
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
                          <h4 className="font-medium">{t('screens.settings.enableQuietHours')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.settings.pauseNonurgentNotificationsDuringSpecifiedTimes')}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs.dnd_enabled}
                          onCheckedChange={(checked) => handleToggle('dnd_enabled', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      {notificationPrefs.dnd_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('screens.settings.startTime')}</label>
                            <Select
                              value={notificationPrefs.dnd_start_time || undefined}
                              onValueChange={(value) => handleTimeChange('dnd_start_time', value)}
                              disabled={loadingSettings}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="20:00">{t('screens.settings.text800Pm')}</SelectItem>
                                <SelectItem value="21:00">{t('screens.settings.text900Pm')}</SelectItem>
                                <SelectItem value="22:00">{t('screens.settings.text1000Pm')}</SelectItem>
                                <SelectItem value="23:00">{t('screens.settings.text1100Pm')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('screens.settings.endTime')}</label>
                            <Select
                              value={notificationPrefs.dnd_end_time || undefined}
                              onValueChange={(value) => handleTimeChange('dnd_end_time', value)}
                              disabled={loadingSettings}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="06:00">{t('screens.settings.text600Am')}</SelectItem>
                                <SelectItem value="07:00">{t('screens.settings.text700Am')}</SelectItem>
                                <SelectItem value="08:00">{t('screens.settings.text800Am')}</SelectItem>
                                <SelectItem value="09:00">{t('screens.settings.text900Am')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="shortcuts">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryCards.map((card) => (
                  <Card 
                    key={card.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(card.path)}
                  >
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                        <card.icon className="w-6 h-6 text-gray-700" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <QuickSetupPopup 
        isOpen={actionPopupOpen}
        onClose={() => setActionPopupOpen(false)}
      />
    </AppLayout>
  );
}

export default Settings;
