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
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRTL } from "@/components/RTLProvider";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { QuickSetupPopup } from "@/components/QuickSetupPopup";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';

function Settings() {
  const navigate = useNavigate();
  const { isRTL, toggleRTL } = useRTL();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'notifications' ? 'categories' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

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
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Appointment Reminders</h4>
                          <p className="text-sm text-muted-foreground">Reminders for upcoming appointments</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">AI Tips & Insights</h4>
                          <p className="text-sm text-muted-foreground">Personalized health and wellness tips</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Weekly Reports</h4>
                          <p className="text-sm text-muted-foreground">Summary of your weekly progress</p>
                        </div>
                        <Switch />
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
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Goal Reminders</h4>
                          <p className="text-sm text-muted-foreground">Daily reminders for your wellness goals</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Friend Activity</h4>
                          <p className="text-sm text-muted-foreground">When friends complete challenges or milestones</p>
                        </div>
                        <Switch />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Breaking News</h4>
                          <p className="text-sm text-muted-foreground">Important health and wellness updates</p>
                        </div>
                        <Switch />
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
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">System Updates</h4>
                          <p className="text-sm text-muted-foreground">App updates and maintenance notifications</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Achievement Alerts</h4>
                          <p className="text-sm text-muted-foreground">Celebrate when you reach milestones</p>
                        </div>
                        <Switch defaultChecked />
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
                        <Switch />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Start Time</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="21:00">9:00 PM</SelectItem>
                              <SelectItem value="22:00">10:00 PM</SelectItem>
                              <SelectItem value="23:00">11:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">End Time</label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="06:00">6:00 AM</SelectItem>
                              <SelectItem value="07:00">7:00 AM</SelectItem>
                              <SelectItem value="08:00">8:00 AM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Weekend Quiet Hours</h4>
                          <p className="text-sm text-muted-foreground">Apply different quiet hours on weekends</p>
                        </div>
                        <Switch />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="shortcuts">
              <div className="grid grid-cols-12 gap-4">
                {/* Row 1: Small + Small + Big (3+3+6) */}
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Quick Actions"
                    subtitle="Available"
                    icon={Users}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-blue-600">4</div>
                        <div className="text-xs text-muted-foreground">Shortcuts ready</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <StandardCard
                    title="Language"
                    subtitle="Current Mode"
                    icon={Languages}
                    content={
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-purple-600">{isRTL ? 'RTL' : 'LTR'}</div>
                        <div className="text-xs text-muted-foreground">Text direction</div>
                      </div>
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <StandardCard
                    title="Quick Settings Actions"
                    subtitle="One-Click Configuration"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/settings/privacy')}
                          className="flex flex-col items-center p-3 h-auto"
                        >
                          <Shield className="w-5 h-5 mb-1" />
                          <span className="text-xs">Privacy</span>
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/settings/notifications')}
                          className="flex flex-col items-center p-3 h-auto"
                        >
                          <Bell className="w-5 h-5 mb-1" />
                          <span className="text-xs">Notifications</span>
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/settings/connected-apps')}
                          className="flex flex-col items-center p-3 h-auto"
                        >
                          <Smartphone className="w-5 h-5 mb-1" />
                          <span className="text-xs">Apps</span>
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={toggleRTL}
                          className="flex flex-col items-center p-3 h-auto"
                        >
                          <Languages className="w-5 h-5 mb-1" />
                          <span className="text-xs">{isRTL ? 'LTR' : 'RTL'}</span>
                        </Button>
                      </div>
                    }
                  />
                </div>

                {/* Row 2: Motivational Banner */}
                <div className="col-span-12">
                  <MotivationalBanner variant="partnership" />
                </div>

                {/* Row 3: Single Full Row (12) */}
                <div className="col-span-12">
                  <StandardCard
                    title="Advanced Quick Actions"
                    subtitle="Coming Soon"
                    icon={SettingsIcon}
                    content={
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>One-click privacy templates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Smart notification presets</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Bulk app connection wizard</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>AI-powered setting suggestions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Voice-controlled configuration</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span>Smart backup and restore</span>
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      <QuickSetupPopup isOpen={actionPopupOpen} onClose={() => setActionPopupOpen(false)} />
    </AppLayout>
  );
}

export default withScreenId(Settings, SCREEN_IDS.SETTINGS_OVERVIEW);