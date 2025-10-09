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
import { Plus, Settings as SettingsIcon, Shield, Bell, Smartphone, CreditCard, HelpCircle, Users, Languages, Mail, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRTL } from "@/components/RTLProvider";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { QuickSetupPopup } from "@/components/QuickSetupPopup";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { useNotificationSettings, NotificationSettings } from "@/hooks/useMessageNotifications";
import { useToast } from "@/hooks/use-toast";

function Settings() {
  const navigate = useNavigate();
  const { isRTL, toggleRTL } = useRTL();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'notifications' ? 'categories' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const { toast } = useToast();
  const { getNotificationSettings, updateNotificationSettings } = useNotificationSettings();

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_events: true,
    email_appointments: true,
    email_ai_tips: true,
    email_weekly_reports: false,
    push_enabled: true,
    push_group_messages: true,
    push_goal_reminders: true,
    push_friend_activity: false,
    push_breaking_news: false,
    inapp_messages: true,
    inapp_system: true,
    inapp_achievements: true,
    dnd_enabled: false,
    dnd_start_time: "22:00",
    dnd_end_time: "08:00",
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getNotificationSettings();
      if (settings) {
        setNotificationSettings(settings);
      }
      setLoadingSettings(false);
    };
    loadSettings();
  }, []);

  // Handler to update a setting
  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    await updateNotificationSettings(newSettings);
    toast({
      title: "✅ Settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  // Handler to update time settings
  const handleTimeChange = async (key: 'dnd_start_time' | 'dnd_end_time', value: string) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    await updateNotificationSettings(newSettings);
    toast({
      title: "✅ Settings updated",
      description: "Your quiet hours have been saved.",
    });
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
      <SEO title="Settings" description="Manage your account settings, privacy, and preferences" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Settings Overview ⚙️"
            description="Manage your account settings, privacy, and preferences to personalize your wellness journey"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search settings, privacy controls, integrations..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Setup
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="overview">Overview</SplitBarTrigger>
              <SplitBarTrigger value="categories">Notifications</SplitBarTrigger>
              <SplitBarTrigger value="shortcuts">Quick Actions</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Big + Small + Small (6+3+3) */}
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Settings Overview"
                    subtitle="Your Account Status"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-600">Protected</div>
                            <div className="text-xs text-muted-foreground">Privacy Status</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">Premium</div>
                            <div className="text-xs text-muted-foreground">Subscription</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Notifications Active</span>
                            <span className="text-blue-600">5 types</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Connected Apps</span>
                            <span className="text-green-600">3 apps</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Privacy Score"
                    subtitle="Protection Level"
                    icon={Shield}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">95%</div>
                        <div className="text-xs text-muted-foreground">Excellent security</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Active Settings"
                    subtitle="Configured"
                    icon={Bell}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">12</div>
                        <div className="text-xs text-muted-foreground">Settings configured</div>
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
                    title="Connected Apps"
                    subtitle="Integrations"
                    icon={Smartphone}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">3</div>
                        <div className="text-xs text-muted-foreground">Active connections</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Billing Status"
                    subtitle="Subscription"
                    icon={CreditCard}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-orange-600">Active</div>
                        <div className="text-xs text-muted-foreground">Until Dec 2024</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Recent Settings Activity"
                    subtitle="Latest Changes"
                    icon={SettingsIcon}
                    content={
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Privacy settings updated 2 days ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Connected new fitness app 1 week ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>Notification preferences saved</span>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="categories">
              <div className="grid grid-cols-12 gap-4">
                {/* Email Notifications */}
                <div className="col-span-12">
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
                          checked={notificationSettings.email_events}
                          onCheckedChange={(checked) => handleToggle('email_events', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Appointment Reminders</h4>
                          <p className="text-sm text-muted-foreground">Reminders for upcoming appointments</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.email_appointments}
                          onCheckedChange={(checked) => handleToggle('email_appointments', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">AI Tips & Insights</h4>
                          <p className="text-sm text-muted-foreground">Personalized health and wellness tips</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.email_ai_tips}
                          onCheckedChange={(checked) => handleToggle('email_ai_tips', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Weekly Reports</h4>
                          <p className="text-sm text-muted-foreground">Summary of your weekly progress</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.email_weekly_reports}
                          onCheckedChange={(checked) => handleToggle('email_weekly_reports', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Push Notifications */}
                <div className="col-span-12">
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
                          checked={notificationSettings.push_group_messages}
                          onCheckedChange={(checked) => handleToggle('push_group_messages', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Goal Reminders</h4>
                          <p className="text-sm text-muted-foreground">Daily reminders for your wellness goals</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.push_goal_reminders}
                          onCheckedChange={(checked) => handleToggle('push_goal_reminders', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Friend Activity</h4>
                          <p className="text-sm text-muted-foreground">When friends complete challenges or milestones</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.push_friend_activity}
                          onCheckedChange={(checked) => handleToggle('push_friend_activity', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Breaking News</h4>
                          <p className="text-sm text-muted-foreground">Important health and wellness updates</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.push_breaking_news}
                          onCheckedChange={(checked) => handleToggle('push_breaking_news', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* In-App Notifications */}
                <div className="col-span-12">
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
                          checked={notificationSettings.inapp_messages}
                          onCheckedChange={(checked) => handleToggle('inapp_messages', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">System Updates</h4>
                          <p className="text-sm text-muted-foreground">App updates and maintenance notifications</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.inapp_system}
                          onCheckedChange={(checked) => handleToggle('inapp_system', checked)}
                          disabled={loadingSettings}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Achievement Alerts</h4>
                          <p className="text-sm text-muted-foreground">Celebrate when you reach milestones</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.inapp_achievements}
                          onCheckedChange={(checked) => handleToggle('inapp_achievements', checked)}
                          disabled={loadingSettings}
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
                          <h4 className="font-medium">Enable Quiet Hours</h4>
                          <p className="text-sm text-muted-foreground">Pause non-urgent notifications during specified times</p>
                        </div>
                        <Switch 
                          checked={notificationSettings.dnd_enabled}
                          onCheckedChange={(checked) => handleToggle('dnd_enabled', checked)}
                          disabled={loadingSettings}
                        />
                      </div>
                      
                      {notificationSettings.dnd_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Start Time</label>
                            <Select 
                              value={notificationSettings.dnd_start_time} 
                              onValueChange={(value) => handleTimeChange('dnd_start_time', value)}
                              disabled={loadingSettings}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="20:00">8:00 PM</SelectItem>
                                <SelectItem value="21:00">9:00 PM</SelectItem>
                                <SelectItem value="22:00">10:00 PM</SelectItem>
                                <SelectItem value="23:00">11:00 PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">End Time</label>
                            <Select 
                              value={notificationSettings.dnd_end_time}
                              onValueChange={(value) => handleTimeChange('dnd_end_time', value)}
                              disabled={loadingSettings}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="06:00">6:00 AM</SelectItem>
                                <SelectItem value="07:00">7:00 AM</SelectItem>
                                <SelectItem value="08:00">8:00 AM</SelectItem>
                                <SelectItem value="09:00">9:00 AM</SelectItem>
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
