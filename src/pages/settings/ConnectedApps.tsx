import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Heart, 
  Activity, 
  Watch, 
  CheckCircle, 
  AlertCircle, 
  Settings as SettingsIcon,
  MessageCircle,
  CreditCard,
  Code,
  Moon,
  Brain,
  Home,
  Utensils,
  Hospital,
} from "lucide-react";
import { settingsNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { ConnectAppPopup } from "@/components/ConnectAppPopup";
import { XIcon } from "@/components/icons/XIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { useSocialPlatforms } from "@/hooks/useSocialPlatforms";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { useState } from "react";

function ConnectedApps() {
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("connected");
  const { allPlatforms, loading } = useSocialPlatforms();

  // Transform social platforms into horizontal cards
  const getSocialMediaCards = (): StandardHorizontalCardProps[] => {
    if (loading || !allPlatforms) return [];
    
    return allPlatforms.map((platform) => {
      const Icon = platform.icon;
      return {
        id: `social-${platform.id}`,
        screenId: "settings-connected-apps",
        icon: <Icon className="w-5 h-5" />,
        title: platform.name,
        description: platform.connected ? platform.url || 'Connected' : 'Not connected',
        badges: platform.connected
          ? [{ label: 'Connected', variant: 'default' as const }]
          : undefined,
        primaryAction: {
          label: platform.connected ? 'Manage' : 'Connect',
          onClick: () => console.log(`${platform.connected ? 'Manage' : 'Connect'} ${platform.name}`),
        },
        expandedContent: platform.connected ? (
          <div className="space-y-3 pt-2">
            <div className="text-sm">
              <strong>Permissions:</strong> Post content, read analytics
            </div>
            <div className="text-sm text-muted-foreground">
              Last sync: 5 minutes ago
            </div>
            <Button variant="destructive" size="sm">Disconnect</Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground pt-2">
            Connect your {platform.name} account to share content directly and track engagement.
          </div>
        ),
      };
    });
  };

  // Health & fitness apps
  const getHealthFitnessCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'apple-health',
        name: 'Apple Health',
        icon: Heart,
        iconColor: 'bg-red-500',
        connected: true,
        syncData: 'Steps, heart rate, sleep',
        lastSync: '2 minutes ago',
      },
      {
        id: 'fitbit',
        name: 'Fitbit',
        icon: Activity,
        iconColor: 'bg-blue-500',
        connected: true,
        syncData: 'Activity, sleep, weight',
        lastSync: '15 minutes ago',
      },
      {
        id: 'strava',
        name: 'Strava',
        icon: Activity,
        iconColor: 'bg-orange-500',
        connected: false,
        syncData: 'Exercise and running data',
      },
      {
        id: 'oura',
        name: 'Oura Ring',
        icon: Watch,
        iconColor: 'bg-purple-500',
        connected: false,
        syncData: 'Sleep, readiness, activity',
      },
      {
        id: 'garmin',
        name: 'Garmin',
        icon: Watch,
        iconColor: 'bg-blue-600',
        connected: false,
        syncData: 'GPS and fitness tracking',
      },
      {
        id: 'myfitnesspal',
        name: 'MyFitnessPal',
        icon: Heart,
        iconColor: 'bg-blue-400',
        connected: true,
        syncData: 'Nutrition, calories',
        lastSync: '1 hour ago',
      },
    ];

    return apps.map((app) => {
      const AppIcon = app.icon;
      return {
        id: `health-${app.id}`,
        screenId: "settings-connected-apps",
        icon: <AppIcon className="w-5 h-5" />,
        title: app.name,
        description: app.syncData,
        badges: app.connected
          ? [{ label: 'Connected', variant: 'default' as const }]
          : undefined,
        primaryAction: {
          label: app.connected ? 'Settings' : 'Connect',
          onClick: () => console.log(`${app.connected ? 'Configure' : 'Connect'} ${app.name}`),
        },
        expandedContent: app.connected ? (
          <div className="space-y-3 pt-2">
            <div className="text-sm">
              <strong>Data syncing:</strong> {app.syncData}
            </div>
            <div className="text-sm text-muted-foreground">
              Last sync: {app.lastSync}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Configure Sync</Button>
              <Button variant="destructive" size="sm">Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground pt-2">
            Connect {app.name} to automatically sync your {app.syncData.toLowerCase()}.
          </div>
        ),
      };
    });
  };

  // Productivity & calendar apps
  const getProductivityCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        icon: SettingsIcon,
        iconColor: 'bg-blue-500',
        connected: false,
        description: 'Sync events and availability',
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        icon: SettingsIcon,
        iconColor: 'bg-blue-600',
        connected: false,
        description: 'Calendar and email integration',
      },
      {
        id: 'notion',
        name: 'Notion',
        icon: SettingsIcon,
        iconColor: 'bg-gray-700',
        connected: false,
        description: 'Note-taking and productivity',
      },
    ];

    return apps.map((app) => {
      const AppIcon = app.icon;
      return {
        id: `productivity-${app.id}`,
        screenId: "settings-connected-apps",
        icon: <AppIcon className="w-5 h-5" />,
        title: app.name,
        description: app.description,
        badges: app.connected
          ? [{ label: 'Connected', variant: 'default' as const }]
          : [{ label: 'Coming Soon', variant: 'secondary' as const }],
        primaryAction: app.connected ? {
          label: 'Manage',
          onClick: () => console.log(`Manage ${app.name}`),
        } : undefined,
        expandedContent: (
          <div className="text-sm text-muted-foreground pt-2">
            {app.connected 
              ? `Manage your ${app.name} integration settings and permissions.`
              : `${app.name} integration is coming soon!`
            }
          </div>
        ),
      };
    });
  };

  // Data sync & preferences
  const getSyncSettingsCards = (): StandardHorizontalCardProps[] => {
    return [
      {
        id: 'sync-frequency',
        screenId: "settings-connected-apps",
        icon: <Activity className="w-5 h-5" />,
        title: 'Sync Frequency',
        description: 'Current: Every 15 minutes',
        badges: [{ label: 'Auto', variant: 'default' as const }],
        primaryAction: {
          label: 'Configure',
          onClick: () => console.log('Configure sync frequency'),
        },
        expandedContent: (
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium">Choose sync frequency:</div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">Real-time (battery intensive)</Button>
              <Button variant="default" size="sm" className="w-full justify-start">Every 15 minutes ✓</Button>
              <Button variant="outline" size="sm" className="w-full justify-start">Hourly</Button>
              <Button variant="outline" size="sm" className="w-full justify-start">Daily</Button>
            </div>
          </div>
        ),
      },
      {
        id: 'sync-status',
        screenId: "settings-connected-apps",
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Sync Status',
        description: '1,247 data points synced today',
        badges: [{ label: 'Healthy', variant: 'default' as const }],
        primaryAction: {
          label: 'View History',
          onClick: () => console.log('View sync history'),
        },
        expandedContent: (
          <div className="space-y-2 pt-2">
            <div className="text-sm"><strong>Last sync:</strong> 2 minutes ago</div>
            <div className="text-sm"><strong>Success rate:</strong> 99.2%</div>
            <div className="text-sm text-muted-foreground">All connected apps are syncing properly.</div>
            <Button variant="outline" size="sm" className="mt-2">Force Sync All Apps</Button>
          </div>
        ),
      },
      {
        id: 'data-privacy',
        screenId: "settings-connected-apps",
        icon: <AlertCircle className="w-5 h-5" />,
        title: 'Data Privacy',
        description: 'Manage what data is shared',
        primaryAction: {
          label: 'Review',
          onClick: () => console.log('Review privacy settings'),
        },
        expandedContent: (
          <div className="space-y-2 pt-2">
            <div className="text-sm">Control which health metrics are synced and shared with Vitana.</div>
            <div className="text-sm text-muted-foreground">
              All data is encrypted and stored securely.
            </div>
            <Button variant="outline" size="sm" className="mt-2">Privacy Settings</Button>
          </div>
        ),
      },
      {
        id: 'battery-impact',
        screenId: "settings-connected-apps",
        icon: <Activity className="w-5 h-5" />,
        title: 'Battery Impact',
        description: 'Optimize background sync',
        badges: [{ label: 'Optimized', variant: 'secondary' as const }],
        primaryAction: {
          label: 'Optimize',
          onClick: () => console.log('Optimize battery'),
        },
        expandedContent: (
          <div className="space-y-2 pt-2">
            <div className="text-sm">Current battery impact: Low</div>
            <div className="text-sm text-muted-foreground">
              Background sync is optimized for battery life.
            </div>
            <Button variant="outline" size="sm" className="mt-2">Advanced Settings</Button>
          </div>
        ),
      },
    ];
  };

  return (
    <AppLayout>
      <SEO title="Connected Apps | Settings" description="Manage your connected apps and integrations" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Connected Apps 🔗"
            description="Seamless integration, maximum benefit - manage your connected apps and integrations"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search apps, integrations, fitness trackers..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect App
            </Button>
          </UtilityActionButton>

          {/* Vertical-scrolling horizontal lists organized by category */}
      <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
        <SplitBarList className="w-full bg-white/50 backdrop-blur-sm rounded-lg mb-6 gap-1 overflow-x-auto">
          <SplitBarTrigger value="connected" className="flex-1">
            🔗 Connected Apps
          </SplitBarTrigger>
          <SplitBarTrigger value="available" className="flex-1">
            ✨ Available Integrations
          </SplitBarTrigger>
          <SplitBarTrigger value="sync" className="flex-1">
            🔄 Data Sync
          </SplitBarTrigger>
        </SplitBarList>

        {/* Tab 1: Connected Apps (Social Media + Health & Fitness) */}
        <SplitBarContent value="connected">
          <div className="space-y-8">
            {/* Social Media */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                📱 Social Media
              </h2>
              <HorizontalCardList
                items={getSocialMediaCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="social-media"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Health & Fitness Apps */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                💪 Health & Fitness Apps
              </h2>
              <HorizontalCardList
                items={getHealthFitnessCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="health-fitness"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>
          </div>
        </SplitBarContent>

        {/* Tab 2: Available Integrations (Productivity & Calendar) */}
        <SplitBarContent value="available">
          <div className="space-y-8">
            {/* Productivity & Calendar */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                📅 Productivity & Calendar
              </h2>
              <HorizontalCardList
                items={getProductivityCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="productivity"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>
          </div>
        </SplitBarContent>

        {/* Tab 3: Data Sync (Sync Settings & Preferences) */}
        <SplitBarContent value="sync">
          <div className="space-y-8">
            {/* Data Sync & Preferences */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                🔄 Data Sync & Preferences
              </h2>
              <HorizontalCardList
                items={getSyncSettingsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="sync-settings"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>
        </div>
      </div>

      <ConnectAppPopup 
        isOpen={actionPopupOpen} 
        onClose={() => setActionPopupOpen(false)} 
      />
    </AppLayout>
  );
}

export default withScreenId(ConnectedApps, SCREEN_IDS.SETTINGS_CONNECTED_APPS);
