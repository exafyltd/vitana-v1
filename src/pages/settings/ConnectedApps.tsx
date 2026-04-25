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
  Share2,
  Apple,
  TestTube,
  Wallet,
  Braces,
  Link,
  Sparkles,
  RefreshCw,
  Radio,
  Calendar,
  History,
  ListChecks,
  RefreshCcw,
  Clock,
  Mail,
  Contact,
  Phone,
  Music,
  Music2,
  Youtube,
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
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileConnectedAppsView } from "@/components/settings/MobileConnectedAppsView";
import { VaeaChannelsPanel } from "@/components/business/vaea/VaeaChannelsPanel";
// VTID-02403: AI Subscription Connect Phase 1
import {
  useAIProviders,
  useDisconnectAIProvider,
  type AIProviderId,
} from "@/hooks/useAIAssistants";
import { AIAssistantConnectModal } from "@/components/AIAssistantConnectModal";
// VTID-01928: Google OAuth for Gmail/Calendar/Contacts, and dedicated YouTube
// OAuth for YouTube / YouTube Music (narrower scope so users don't grant mail
// and calendar access just to connect YouTube).
import {
  useStartGoogleConnect,
  useStartYouTubeConnect,
  useSocialConnections,
  GOOGLE_CONNECTOR_IDS,
  YOUTUBE_CONNECTOR_IDS,
} from "@/hooks/useGoogleConnect";
import { GoogleConnectionVerifyDialog } from "@/components/settings/GoogleConnectionVerifyDialog";
import { SessionExpiredBanner } from "@/components/settings/SessionExpiredBanner";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

function ConnectedApps() {
  const isMobile = useIsMobile();
  const [actionPopupOpen, setActionPopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("connected");
  const { allPlatforms, loading } = useSocialPlatforms();
  // VTID-02403: AI Assistants state
  const { data: aiProviders = [] } = useAIProviders();
  const disconnectAi = useDisconnectAIProvider();
  const [aiModalProvider, setAiModalProvider] = useState<AIProviderId | null>(null);

  // VTID-01928: Google connector state (single consent → Gmail/Calendar/Contacts)
  // + dedicated YouTube connection (YouTube / YouTube Music).
  const { toast } = useToast();
  const { data: socialConnections = [], error: socialConnectionsError } = useSocialConnections();
  const startGoogle = useStartGoogleConnect();
  const startYouTube = useStartYouTubeConnect();
  const googleConnection = socialConnections.find((c) => c.provider === "google");
  const googleConnected = Boolean(googleConnection);
  const youtubeConnection = socialConnections.find((c) => c.provider === "youtube");
  const youtubeConnected = Boolean(youtubeConnection);
  const [googleVerifyOpen, setGoogleVerifyOpen] = useState(false);
  const manageGoogle = () => setGoogleVerifyOpen(true);

  const startConnectorFlow = (connectorId: string) => {
    if (YOUTUBE_CONNECTOR_IDS.has(connectorId)) {
      startYouTube.mutate(undefined, {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({
            title: "Couldn't start YouTube sign-in",
            description: message,
            variant: "destructive",
          });
        },
      });
      return;
    }
    startGoogle.mutate(undefined, {
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        toast({
          title: "Couldn't start Google sign-in",
          description: message,
          variant: "destructive",
        });
      },
    });
  };

  // Show a success / error toast when returning from the OAuth callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const errorCode = params.get("error");
    const provider = params.get("provider");
    if (connected === "google") {
      const username = params.get("username") || "";
      toast({
        title: "Google connected",
        description: username
          ? `Gmail, Calendar and Contacts are now linked to ${username}.`
          : "Gmail, Calendar and Contacts are now linked.",
      });
      params.delete("connected");
      params.delete("username");
      const cleaned = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (cleaned ? `?${cleaned}` : ""));
    } else if (connected === "youtube") {
      const username = params.get("username") || "";
      toast({
        title: "YouTube connected",
        description: username
          ? `YouTube and YouTube Music are now linked to ${username}.`
          : "YouTube and YouTube Music are now linked.",
      });
      params.delete("connected");
      params.delete("username");
      const cleaned = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (cleaned ? `?${cleaned}` : ""));
    } else if (errorCode && (provider === "google" || provider === "youtube")) {
      const label = provider === "youtube" ? "YouTube" : "Google";
      const retry = provider === "youtube"
        ? () => startYouTube.mutate()
        : () => startGoogle.mutate();
      toast({
        title: `${label} sign-in didn't finish`,
        description: errorCode.replace(/_/g, " "),
        variant: "destructive",
        action: (
          <ToastAction altText={`Retry ${label} sign-in`} onClick={retry}>
            Try again
          </ToastAction>
        ),
      });
      params.delete("error");
      params.delete("provider");
      const cleaned = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (cleaned ? `?${cleaned}` : ""));
    }
  }, [toast, startGoogle, startYouTube]);

  // Mobile view - simplified, native-feeling experience
  if (isMobile) {
    return (
      <AppLayout>
        <SEO 
          title="Connected Apps & Integrations"
          description="Manage your connected devices and services"
        />
        <MobileConnectedAppsView />
      </AppLayout>
    );
  }

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

  // VTID-02403: AI Assistants cards (ChatGPT + Claude)
  const getAIAssistantsCards = (): StandardHorizontalCardProps[] => {
    // If the backend hasn't responded yet, show the known two providers as "available" skeletons.
    const fallback: Array<{ provider: AIProviderId; display_name: string; description: string }> = [
      { provider: "chatgpt", display_name: "ChatGPT", description: "OpenAI API — chat, reasoning, drafting" },
      { provider: "claude", display_name: "Claude", description: "Anthropic API — chat, reasoning, long context" },
    ];
    const source = aiProviders.length > 0
      ? aiProviders.map((p) => ({
        provider: p.provider as AIProviderId,
        display_name: p.display_name,
        description: p.description || `${p.display_name} via user-supplied API key`,
        status: p.status,
        last_verify_status: p.last_verify_status,
        last_verified_at: p.last_verified_at,
      }))
      : fallback.map((p) => ({ ...p, status: "available" as const, last_verify_status: null, last_verified_at: null }));

    return source.map((p) => {
      const isConnected = p.status === "connected";
      const isDisabled = p.status === "disabled";
      const badges: StandardHorizontalCardProps["badges"] =
        isConnected && p.last_verify_status === "ok"
          ? [{ label: "Active", variant: "default" as const }]
          : isConnected
            ? [{ label: "Connected (not verified)", variant: "secondary" as const }]
            : isDisabled
              ? [{ label: "Disabled for tenant", variant: "secondary" as const }]
              : undefined;
      return {
        id: `ai-${p.provider}`,
        screenId: "settings-connected-apps",
        icon: <Sparkles className="w-5 h-5" />,
        title: p.display_name,
        description: p.description,
        badges,
        primaryAction: isDisabled
          ? undefined
          : isConnected
            ? {
              label: "Manage",
              onClick: () => setAiModalProvider(p.provider),
              variant: "ghost" as const,
            }
            : {
              label: "Connect",
              onClick: () => setAiModalProvider(p.provider),
            },
        expandedContent: isConnected ? (
          <div className="space-y-3 pt-2">
            <div className="text-sm">
              <strong>Status:</strong> {p.last_verify_status || "unverified"}
            </div>
            {p.last_verified_at && (
              <div className="text-sm text-muted-foreground">
                Last verified: {new Date(p.last_verified_at).toLocaleString()}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiModalProvider(p.provider)}
              >
                Replace key
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnectAi.mutate({ provider: p.provider })}
                disabled={disconnectAi.isPending}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground pt-2">
            {isDisabled
              ? `${p.display_name} is not enabled for this community.`
              : `Paste your ${p.display_name} API key to enable your personal AI assistant. Keys are encrypted at rest and never exposed again.`}
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

  // Sleep & Recovery Devices
  const getSleepRecoveryCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'oura',
        name: 'Oura Ring',
        icon: Moon,
        connected: true,
        syncData: 'Sleep quality, readiness, HRV',
        lastSync: '1 hour ago',
      },
      {
        id: 'eightsleep',
        name: 'Eight Sleep',
        icon: Moon,
        connected: false,
        syncData: 'Sleep stages, temperature',
        comingSoon: true,
      },
      {
        id: 'withings-sleep',
        name: 'Withings Sleep Analyzer',
        icon: Moon,
        connected: false,
        syncData: 'Sleep tracking, breathing patterns',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `sleep-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: app.connected
        ? [{ label: 'Connected', variant: 'default' as const }]
        : app.comingSoon
          ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
          : undefined,
      primaryAction: app.connected
        ? { label: 'Settings', onClick: () => console.log(`Settings ${app.name}`) }
        : !app.comingSoon
          ? { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) }
          : undefined,
      expandedContent: app.connected ? (
        <div className="space-y-3 pt-2">
          <div className="text-sm"><strong>Data syncing:</strong> {app.syncData}</div>
          <div className="text-sm text-muted-foreground">Last sync: {app.lastSync}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Configure Sync</Button>
            <Button variant="destructive" size="sm">Disconnect</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground pt-2">
          {app.comingSoon 
            ? `${app.name} integration is coming soon.`
            : `Connect ${app.name} to automatically sync your ${app.syncData.toLowerCase()}.`
          }
        </div>
      ),
    }));
  };

  // Nutrition & Wellness Apps
  const getNutritionCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'myfitnesspal',
        name: 'MyFitnessPal',
        icon: Apple,
        connected: true,
        syncData: 'Nutrition, calories, macros',
        lastSync: '30 minutes ago',
      },
      {
        id: 'cronometer',
        name: 'Cronometer',
        icon: Utensils,
        connected: false,
        syncData: 'Detailed nutrition tracking',
        comingSoon: true,
      },
      {
        id: 'lifesum',
        name: 'Lifesum',
        icon: Apple,
        connected: false,
        syncData: 'Meal planning, nutrition',
        comingSoon: true,
      },
      {
        id: 'yazio',
        name: 'Yazio',
        icon: Utensils,
        connected: false,
        syncData: 'Calorie counter, diet plans',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `nutrition-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: app.connected
        ? [{ label: 'Connected', variant: 'default' as const }]
        : app.comingSoon
          ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
          : undefined,
      primaryAction: app.connected
        ? { label: 'Settings', onClick: () => console.log(`Settings ${app.name}`) }
        : !app.comingSoon
          ? { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) }
          : undefined,
      expandedContent: app.connected ? (
        <div className="space-y-3 pt-2">
          <div className="text-sm"><strong>Data syncing:</strong> {app.syncData}</div>
          <div className="text-sm text-muted-foreground">Last sync: {app.lastSync}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Configure Sync</Button>
            <Button variant="destructive" size="sm">Disconnect</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground pt-2">
          {app.comingSoon 
            ? `${app.name} integration is coming soon.`
            : `Connect ${app.name} to track your ${app.syncData.toLowerCase()}.`
          }
        </div>
      ),
    }));
  };

  // Clinical & Lab Integrations
  const getClinicalLabCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'lifespin',
        name: 'Lifespin',
        icon: Hospital,
        connected: false,
        syncData: 'Metabolic health insights',
        comingSoon: true,
      },
      {
        id: 'fhir',
        name: 'FHIR Providers',
        icon: Hospital,
        connected: false,
        syncData: 'Clinical health records',
        comingSoon: true,
      },
      {
        id: 'partner-labs',
        name: 'Partner Labs (AlKalma, Earthlinks)',
        icon: TestTube,
        connected: false,
        syncData: 'Lab test results, biomarker tracking',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `clinical-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: undefined,
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon. This will enable secure access to {app.syncData.toLowerCase()}.
        </div>
      ),
    }));
  };

  // Mindfulness & Mental Health
  const getMindfulnessCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'calm',
        name: 'Calm',
        icon: Brain,
        connected: false,
        syncData: 'Meditation, mindfulness sessions',
        comingSoon: false,
      },
      {
        id: 'headspace',
        name: 'Headspace',
        icon: Brain,
        connected: false,
        syncData: 'Guided meditation, sleep sounds',
        comingSoon: false,
      },
      {
        id: 'muse',
        name: 'Muse',
        icon: Brain,
        connected: false,
        syncData: 'Brain activity, meditation feedback',
        comingSoon: false,
      },
    ];

    return apps.map((app) => ({
      id: `mindfulness-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: app.comingSoon
        ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
        : undefined,
      primaryAction: !app.comingSoon
        ? { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) }
        : undefined,
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.comingSoon 
            ? `${app.name} integration is coming soon.`
            : `Connect ${app.name} to track your ${app.syncData.toLowerCase()}.`
          }
        </div>
      ),
    }));
  };

  // Smart Home & Environment
  const getSmartHomeCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'smart-scales',
        name: 'Smart Scales',
        icon: Home,
        connected: false,
        syncData: 'Weight, body composition',
        comingSoon: true,
      },
      {
        id: 'air-quality',
        name: 'Air Quality Sensors',
        icon: Home,
        connected: false,
        syncData: 'Indoor air quality monitoring',
        comingSoon: true,
      },
      {
        id: 'smart-thermometer',
        name: 'Smart Thermometers',
        icon: Home,
        connected: false,
        syncData: 'Body temperature tracking',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `smarthome-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: undefined,
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon. Track your {app.syncData.toLowerCase()}.
        </div>
      ),
    }));
  };

  // Mail, Calendar & Contacts — Gmail, Apple Mail, Outlook + iPhone/Android/Google Contacts
  // Plus legacy messaging apps (WhatsApp, Telegram) kept as coming-soon.
  const getCommunicationCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'gmail',
        name: 'Gmail',
        icon: Mail,
        syncData: 'Email inbox, drafts, labels',
        comingSoon: false,
      },
      {
        id: 'apple-mail',
        name: 'Apple Mail (iPhone)',
        icon: Mail,
        syncData: 'iOS Mail accounts and inbox',
        comingSoon: false,
      },
      {
        id: 'outlook-mail',
        name: 'Outlook Mail',
        icon: Mail,
        syncData: 'Microsoft email inbox',
        comingSoon: false,
      },
      {
        id: 'google-contacts',
        name: 'Google Contacts',
        icon: Contact,
        syncData: 'Contact directory',
        comingSoon: false,
      },
      {
        id: 'iphone-contacts',
        name: 'iPhone Contacts',
        icon: Phone,
        syncData: 'Address book from iOS',
        comingSoon: false,
      },
      {
        id: 'android-contacts',
        name: 'Android Contacts',
        icon: Phone,
        syncData: 'Address book from Android',
        comingSoon: false,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: MessageCircle,
        syncData: 'Messaging integration',
        comingSoon: true,
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: MessageCircle,
        syncData: 'Bot and messaging',
        comingSoon: true,
      },
    ];

    return apps.map((app) => {
      const isGoogle = GOOGLE_CONNECTOR_IDS.has(app.id);
      const isConnected = isGoogle && googleConnected;
      const badges = app.comingSoon
        ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
        : isConnected
          ? [{ label: 'Connected', variant: 'default' as const }]
          : undefined;
      const primaryAction = app.comingSoon
        ? undefined
        : isGoogle
          ? isConnected
            ? { label: 'Manage', onClick: manageGoogle }
            : {
                label: 'Connect',
                onClick: () => startConnectorFlow(app.id),
                disabled: startGoogle.isPending,
              }
          : {
              label: 'Connect',
              onClick: () => console.log(`Connect ${app.name}`),
            };
      return {
        id: `communication-${app.id}`,
        screenId: "settings-connected-apps",
        icon: <app.icon className="w-5 h-5" />,
        title: app.name,
        description: app.syncData,
        badges,
        primaryAction,
        expandedContent: (
          <div className="text-sm text-muted-foreground pt-2">
            {app.comingSoon
              ? `${app.name} integration is coming soon. This will enable ${app.syncData.toLowerCase()}.`
              : isConnected
                ? `${app.name} is linked to ${googleConnection?.username ?? 'your Google account'}.`
                : `Connect ${app.name} to sync ${app.syncData.toLowerCase()} with Vitana.`}
          </div>
        ),
      };
    });
  };

  // Wallet & Payments
  const getWalletPaymentsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'apple-pay',
        name: 'Apple Pay',
        icon: Wallet,
        connected: false,
        syncData: 'Payment method',
        comingSoon: true,
      },
      {
        id: 'google-pay',
        name: 'Google Pay',
        icon: Wallet,
        connected: false,
        syncData: 'Payment method',
        comingSoon: true,
      },
      {
        id: 'stripe',
        name: 'Stripe Connect',
        icon: CreditCard,
        connected: false,
        syncData: 'Payment processing',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `wallet-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: undefined,
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon.
        </div>
      ),
    }));
  };

  // Developer & Pro Tools
  const getDeveloperToolsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'api-keys',
        name: 'API Keys',
        icon: Code,
        connected: false,
        syncData: 'Developer access',
        comingSoon: true,
      },
      {
        id: 'csv-import',
        name: 'CSV Health Import',
        icon: Code,
        connected: false,
        syncData: 'Bulk data import',
        comingSoon: false,
      },
      {
        id: 'zapier',
        name: 'Zapier',
        icon: Braces,
        connected: false,
        syncData: 'Workflow automation',
        comingSoon: true,
      },
      {
        id: 'n8n',
        name: 'n8n',
        icon: Braces,
        connected: false,
        syncData: 'Open-source automation',
        comingSoon: true,
      },
    ];

    return apps.map((app) => ({
      id: `developer-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.syncData,
      badges: app.comingSoon
        ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
        : undefined,
      primaryAction: !app.comingSoon
        ? { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) }
        : undefined,
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.comingSoon 
            ? `${app.name} integration is coming soon.`
            : `Enable ${app.name} for ${app.syncData.toLowerCase()}.`
          }
        </div>
      ),
    }));
  };

  // Productivity & calendar apps — Google / Apple / Outlook Calendar connectable, Notion coming soon.
  const getProductivityCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        icon: Calendar,
        connected: false,
        comingSoon: false,
        description: 'Events, meetings, availability',
      },
      {
        id: 'apple-calendar',
        name: 'Apple Calendar (iPhone)',
        icon: Calendar,
        connected: false,
        comingSoon: false,
        description: 'iOS Calendar events',
      },
      {
        id: 'outlook-calendar',
        name: 'Outlook Calendar',
        icon: Calendar,
        connected: false,
        comingSoon: false,
        description: 'Microsoft calendar events',
      },
      {
        id: 'notion',
        name: 'Notion',
        icon: SettingsIcon,
        connected: false,
        comingSoon: true,
        description: 'Note-taking and productivity',
      },
    ];

    return apps.map((app) => {
      const AppIcon = app.icon;
      const isGoogle = GOOGLE_CONNECTOR_IDS.has(app.id);
      const isConnected = app.connected || (isGoogle && googleConnected);
      const badges = isConnected
        ? [{ label: 'Connected', variant: 'default' as const }]
        : app.comingSoon
          ? [{ label: 'Coming Soon', variant: 'secondary' as const }]
          : undefined;
      const primaryAction = isConnected
        ? { label: 'Manage', onClick: isGoogle ? manageGoogle : () => console.log(`Manage ${app.name}`) }
        : app.comingSoon
          ? undefined
          : isGoogle
            ? {
                label: 'Connect',
                onClick: () => startConnectorFlow(app.id),
                disabled: startGoogle.isPending,
              }
            : { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) };
      return {
        id: `productivity-${app.id}`,
        screenId: "settings-connected-apps",
        icon: <AppIcon className="w-5 h-5" />,
        title: app.name,
        description: app.description,
        badges,
        primaryAction,
        expandedContent: (
          <div className="text-sm text-muted-foreground pt-2">
            {isConnected
              ? isGoogle
                ? `${app.name} is linked to ${googleConnection?.username ?? 'your Google account'}.`
                : `Manage your ${app.name} integration settings and permissions.`
              : app.comingSoon
                ? `${app.name} integration is coming soon!`
                : `Connect ${app.name} to sync ${app.description.toLowerCase()} with Vitana.`}
          </div>
        ),
      };
    });
  };

  // Entertainment & Media — Spotify, Apple Music, YouTube Music, YouTube.
  // Lets Vitana act on commands like "play Thriller by Michael Jackson".
  const getEntertainmentMediaCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'spotify',
        name: 'Spotify',
        icon: Music,
        description: 'Music playback, playlists, listening history',
      },
      {
        id: 'apple-music',
        name: 'Apple Music',
        icon: Music2,
        description: 'Music playback and library',
      },
      {
        id: 'youtube-music',
        name: 'YouTube Music',
        icon: Music2,
        description: 'Music streaming, playlists',
      },
      {
        id: 'youtube-playback',
        name: 'YouTube',
        icon: Youtube,
        description: 'Video playback, watch history',
      },
    ];

    return apps.map((app) => {
      const isYouTube = YOUTUBE_CONNECTOR_IDS.has(app.id);
      const isGoogle = GOOGLE_CONNECTOR_IDS.has(app.id);
      const isOAuthBacked = isYouTube || isGoogle;
      const isConnected =
        (isYouTube && youtubeConnected) || (isGoogle && googleConnected);
      const linkedAccount = isYouTube
        ? youtubeConnection?.username ??
          youtubeConnection?.display_name ??
          'your YouTube account'
        : googleConnection?.username ?? 'your Google account';
      return {
        id: `media-${app.id}`,
        screenId: "settings-connected-apps",
        icon: <app.icon className="w-5 h-5" />,
        title: app.name,
        description: app.description,
        badges: isConnected
          ? [{ label: 'Connected', variant: 'default' as const }]
          : undefined,
        primaryAction: isConnected
          ? {
              label: 'Manage',
              onClick: isGoogle ? manageGoogle : () => console.log(`Manage ${app.name}`),
            }
          : isOAuthBacked
            ? {
                label: 'Connect',
                onClick: () => startConnectorFlow(app.id),
                disabled: isYouTube ? startYouTube.isPending : startGoogle.isPending,
              }
            : { label: 'Connect', onClick: () => console.log(`Connect ${app.name}`) },
        expandedContent: (
          <div className="text-sm text-muted-foreground pt-2">
            {isConnected
              ? `${app.name} is linked to ${linkedAccount}.`
              : `Connect ${app.name} to enable ${app.description.toLowerCase()} through Vitana.`}
          </div>
        ),
      };
    });
  };

  // Data sync & preferences
  const getWellnessFitnessIntegrationsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'eightsleep',
        name: 'Eight Sleep',
        icon: Activity,
        description: 'Sleep stages, temperature',
      },
      {
        id: 'withings',
        name: 'Withings',
        icon: Activity,
        description: 'Health metrics, body composition',
      },
      {
        id: 'huawei-health',
        name: 'Huawei Health',
        icon: Activity,
        description: 'Activity tracking, heart rate',
      },
      {
        id: 'polar-flow',
        name: 'Polar Flow',
        icon: Activity,
        description: 'Training load, recovery',
      },
      {
        id: 'suunto',
        name: 'Suunto',
        icon: Activity,
        description: 'Sports tracking, fitness data',
      },
    ];

    return apps.map((app) => ({
      id: `wellness-fitness-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getNutritionLifestyleCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'cronometer',
        name: 'Cronometer',
        icon: Utensils,
        description: 'Detailed nutrition tracking',
      },
      {
        id: 'yazio',
        name: 'Yazio',
        icon: Apple,
        description: 'Calorie counter, diet plans',
      },
      {
        id: 'lifesum',
        name: 'Lifesum',
        icon: Apple,
        description: 'Meal planning, nutrition',
      },
      {
        id: 'loseit',
        name: 'LoseIt!',
        icon: Utensils,
        description: 'Weight loss, calorie tracking',
      },
    ];

    return apps.map((app) => ({
      id: `nutrition-lifestyle-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getClinicalLabsIntegrationsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'lifespin',
        name: 'Lifespin',
        icon: TestTube,
        description: 'Metabolic health insights',
      },
      {
        id: 'fhir-providers',
        name: 'FHIR Providers',
        icon: Hospital,
        description: 'Clinical health records',
      },
      {
        id: 'partner-labs',
        name: 'Partner Labs (AlKalma, Earthlinks)',
        icon: TestTube,
        description: 'Lab test results, biomarker tracking',
      },
      {
        id: 'metabolomics',
        name: 'Metabolomics Providers',
        icon: Hospital,
        description: 'Advanced metabolic profiling',
      },
    ];

    return apps.map((app) => ({
      id: `clinical-labs-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon. This will enable secure access to {app.description.toLowerCase()}.
        </div>
      ),
    }));
  };

  const getMentalHealthMindfulnessCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'calm',
        name: 'Calm',
        icon: Brain,
        description: 'Meditation, mindfulness sessions',
      },
      {
        id: 'headspace',
        name: 'Headspace',
        icon: Brain,
        description: 'Guided meditation, sleep sounds',
      },
      {
        id: 'muse',
        name: 'Muse',
        icon: Brain,
        description: 'Brain activity, meditation feedback',
      },
      {
        id: 'waking-up',
        name: 'Waking Up',
        icon: Brain,
        description: 'Meditation and philosophy',
      },
    ];

    return apps.map((app) => ({
      id: `mental-health-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getSmartHomeEnvironmentCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'smart-scales',
        name: 'Smart Scales',
        icon: Home,
        description: 'Weight, body composition',
      },
      {
        id: 'air-quality-sensors',
        name: 'Air Quality Sensors',
        icon: Home,
        description: 'Indoor air quality monitoring',
      },
      {
        id: 'sleep-pod-devices',
        name: 'Sleep Pod Devices',
        icon: Home,
        description: 'Sleep environment optimization',
      },
      {
        id: 'room-temp-sensors',
        name: 'Room Temperature Sensors',
        icon: Home,
        description: 'Environmental temperature tracking',
      },
    ];

    return apps.map((app) => ({
      id: `smart-home-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getCommunicationAppsIntegrationsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: MessageCircle,
        description: 'Messaging integration',
      },
      {
        id: 'telegram',
        name: 'Telegram',
        icon: MessageCircle,
        description: 'Bot and messaging',
      },
      {
        id: 'gmail',
        name: 'Gmail',
        icon: MessageCircle,
        description: 'Email notifications',
      },
      {
        id: 'outlook-mail',
        name: 'Outlook Mail',
        icon: MessageCircle,
        description: 'Email integration',
      },
    ];

    return apps.map((app) => ({
      id: `communication-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getWalletPaymentsIntegrationsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'apple-pay',
        name: 'Apple Pay',
        icon: Wallet,
        description: 'Payment method',
      },
      {
        id: 'google-pay',
        name: 'Google Pay',
        icon: Wallet,
        description: 'Payment method',
      },
      {
        id: 'stripe-connect',
        name: 'Stripe Connect',
        icon: CreditCard,
        description: 'Payment processing',
      },
    ];

    return apps.map((app) => ({
      id: `wallet-payments-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getDeveloperToolsIntegrationsCards = (): StandardHorizontalCardProps[] => {
    const apps = [
      {
        id: 'api-keys',
        name: 'API Keys',
        icon: Code,
        description: 'Developer access',
      },
      {
        id: 'csv-import',
        name: 'CSV Import',
        icon: Code,
        description: 'Bulk data import',
      },
      {
        id: 'zapier',
        name: 'Zapier',
        icon: Braces,
        description: 'Workflow automation',
      },
      {
        id: 'n8n',
        name: 'n8n',
        icon: Braces,
        description: 'Open-source automation',
      },
    ];

    return apps.map((app) => ({
      id: `developer-tools-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: app.description,
      badges: [{ label: 'Coming Soon', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Connect',
        onClick: () => console.log(`Connect ${app.name}`),
        disabled: true,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="text-sm text-muted-foreground pt-2">
          {app.name} integration is coming soon!
        </div>
      ),
    }));
  };

  const getSyncOverviewCard = (): StandardHorizontalCardProps => {
    const [isSyncing, setIsSyncing] = useState(false);
    
    return {
      id: 'sync-overview',
      screenId: "settings-connected-apps",
      icon: <RefreshCw className="w-5 h-5" />,
      title: 'System Sync Status',
      description: 'Shows the last time your data was synchronized across all connected apps',
      badges: [{ label: 'All Systems Operational', variant: 'default' as const }],
      primaryAction: {
        label: isSyncing ? 'Syncing...' : 'Sync Now',
        onClick: () => {
          setIsSyncing(true);
          console.log('Manual sync triggered');
          setTimeout(() => setIsSyncing(false), 3000);
        },
        disabled: isSyncing,
        variant: 'ghost' as const,
        icon: <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />,
      },
      expandedContent: (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Last Sync</div>
              <div className="text-sm text-muted-foreground">15 minutes ago</div>
            </div>
            <div>
              <div className="text-sm font-medium">Total Synced Apps</div>
              <div className="text-sm text-muted-foreground">5 connected</div>
            </div>
            <div>
              <div className="text-sm font-medium">Pending Syncs</div>
              <div className="text-sm text-muted-foreground">1 in queue</div>
            </div>
            <div>
              <div className="text-sm font-medium">Next Automatic Sync</div>
              <div className="text-sm text-muted-foreground">In 45 minutes</div>
            </div>
          </div>
        </div>
      ),
    };
  };

  const getPerAppSyncCards = (): StandardHorizontalCardProps[] => {
    const connectedApps = [
      {
        id: 'apple-health',
        name: 'Apple Health',
        icon: Heart,
        lastSync: '12 minutes ago',
        newData: 'Sleep, Steps, Heart Rate',
        connected: true,
      },
      {
        id: 'fitbit',
        name: 'Fitbit',
        icon: Activity,
        lastSync: '8 minutes ago',
        newData: 'Activity, Sleep, Weight',
        connected: true,
      },
      {
        id: 'strava',
        name: 'Strava',
        icon: Activity,
        lastSync: '14 minutes ago',
        newData: 'Running, Cycling',
        connected: true,
      },
      {
        id: 'oura',
        name: 'Oura Ring',
        icon: Moon,
        lastSync: '10 minutes ago',
        newData: 'Sleep, Readiness, Activity',
        connected: true,
      },
      {
        id: 'garmin',
        name: 'Garmin',
        icon: Watch,
        lastSync: '21 minutes ago',
        newData: 'GPS data, Heart Rate, Activity',
        connected: true,
      },
      {
        id: 'myfitnesspal',
        name: 'MyFitnessPal',
        icon: Apple,
        lastSync: '5 minutes ago',
        newData: 'Nutrition, Calories',
        connected: true,
      },
    ];

    return connectedApps.map((app) => ({
      id: `app-sync-${app.id}`,
      screenId: "settings-connected-apps",
      icon: <app.icon className="w-5 h-5" />,
      title: app.name,
      description: `Last Sync: ${app.lastSync}`,
      badges: app.connected 
        ? [{ label: 'Synced', variant: 'default' as const }]
        : [{ label: 'Not Connected', variant: 'secondary' as const }],
      primaryAction: {
        label: 'Sync',
        onClick: () => console.log(`Sync ${app.name}`),
        disabled: !app.connected,
        variant: 'ghost' as const,
      },
      expandedContent: (
        <div className="space-y-3 pt-2">
          <div className="text-sm">
            <strong>Data Synced:</strong> {app.newData}
          </div>
          <div className="text-sm">
            <strong>Last Sync:</strong> {app.lastSync}
          </div>
          {app.connected && (
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm">Configure Sync</Button>
              <Button variant="outline" size="sm">View Details</Button>
            </div>
          )}
        </div>
      ),
    }));
  };

  const getSyncHistoryCard = (filter: string): StandardHorizontalCardProps => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const allEntries = [
      { 
        timestamp: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 42 * 60 * 1000), // 10:42 AM today
        app: 'Fitbit', 
        action: 'synced steps + heart rate', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 39 * 60 * 1000), // 10:39 AM today
        app: 'Apple Health', 
        action: 'synced sleep', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 10 * 60 * 60 * 1000 + 15 * 60 * 1000), // 10:15 AM today
        app: 'MyFitnessPal', 
        action: 'synced nutrition', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 50 * 60 * 1000), // 9:50 AM today
        app: 'Oura Ring', 
        action: 'synced readiness + HRV', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000 + 34 * 60 * 1000), // 9:34 AM today
        app: 'Garmin', 
        action: 'synced GPS + activity', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 8 * 60 * 60 * 1000 + 10 * 60 * 1000), // 8:10 AM today
        app: 'Fitbit', 
        action: 'synced steps + calories', 
        isError: false 
      },
      { 
        timestamp: new Date(today.getTime() + 7 * 60 * 60 * 1000 + 12 * 60 * 1000), // 7:12 AM today
        app: 'Fitbit', 
        action: 'sync failed', 
        isError: true 
      },
      { 
        timestamp: new Date(yesterday.getTime() + 22 * 60 * 60 * 1000 + 48 * 60 * 1000), // Yesterday 10:48 PM
        app: 'Apple Health', 
        action: 'synced sleep', 
        isError: false 
      },
      { 
        timestamp: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000 + 22 * 60 * 1000), // Yesterday 6:22 PM
        app: 'MyFitnessPal', 
        action: 'synced dinner calories', 
        isError: false 
      },
      { 
        timestamp: new Date(twoDaysAgo.getTime() + 15 * 60 * 60 * 1000 + 30 * 60 * 1000), // 2 days ago 3:30 PM
        app: 'Strava', 
        action: 'synced running activity', 
        isError: false 
      },
      { 
        timestamp: new Date(threeDaysAgo.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000), // 3 days ago 9:15 AM
        app: 'Oura Ring', 
        action: 'synced sleep score', 
        isError: false 
      },
    ];

    const formatTimestamp = (date: Date): string => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      const timeString = `${displayHours}:${displayMinutes} ${ampm}`;
      
      if (date >= today) {
        return timeString;
      } else if (date >= yesterday) {
        return `Yesterday ${timeString}`;
      } else {
        const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return `${daysAgo} days ago`;
      }
    };

    let filteredEntries = allEntries;
    
    if (filter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      filteredEntries = allEntries.filter(e => 
        e.timestamp >= todayStart && e.timestamp < todayEnd
      );
    } else if (filter === 'last7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredEntries = allEntries.filter(e => e.timestamp >= sevenDaysAgo);
    } else if (filter === 'errors') {
      filteredEntries = allEntries.filter(e => e.isError);
    }

    return {
      id: 'sync-history',
      screenId: "settings-connected-apps",
      icon: <History className="w-5 h-5" />,
      title: 'Sync Activity Log',
      description: 'Chronological history of all sync events',
      expandedContent: (
        <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sync events for this filter yet.</p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 py-1"
              >
                {entry.isError ? (
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 text-sm leading-relaxed">
                  <span className="text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className={`font-semibold ${entry.isError ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {entry.isError ? 'Error — ' : ''}{entry.app}
                  </span>
                  <span className={entry.isError ? 'text-red-600 dark:text-red-400' : ''}> {entry.action}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ),
    };
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

          <SessionExpiredBanner error={socialConnectionsError} />

          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton placeholder="Search apps, integrations, fitness trackers..." />
              <UniversalCalendarButton />
              <Button size="sm" onClick={() => setActionPopupOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect App
              </Button>
            </div>
          </UtilityActionButton>

          {/* Vertical-scrolling horizontal lists organized by category */}
      <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
        <SplitBarList className="w-full bg-white/50 backdrop-blur-sm rounded-lg mb-6 gap-1 overflow-x-auto">
          <SplitBarTrigger value="connected" className="flex-1 flex items-center justify-center gap-1.5">
            <Link className="w-4 h-4" />
            Connected Apps
          </SplitBarTrigger>
          <SplitBarTrigger value="available" className="flex-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Available Integrations
          </SplitBarTrigger>
          <SplitBarTrigger value="sync" className="flex-1 flex items-center justify-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Data Sync
          </SplitBarTrigger>
          <SplitBarTrigger value="agent-ingest" className="flex-1 flex items-center justify-center gap-1.5">
            <Radio className="w-4 h-4" />
            Autopilot
          </SplitBarTrigger>
        </SplitBarList>

        {/* Tab 1: Connected Apps (Social Media + Health & Fitness) */}
        <SplitBarContent value="connected">
          <div className="space-y-8">
            {/* VTID-02403: AI Assistants (ChatGPT + Claude) */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Assistants
              </h2>
              <HorizontalCardList
                items={getAIAssistantsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="ai-assistants"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Social Media */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Social Media & Sharing
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
                <Activity className="w-5 h-5" />
                Wearables & Fitness Apps
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

            {/* Sleep & Recovery Devices */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Sleep & Recovery Devices
              </h2>
              <HorizontalCardList
                items={getSleepRecoveryCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="sleep-recovery"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Nutrition & Wellness Apps */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                Nutrition & Wellness Apps
              </h2>
              <HorizontalCardList
                items={getNutritionCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="nutrition"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Clinical & Lab Integrations */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Clinical & Lab Integrations
              </h2>
              <HorizontalCardList
                items={getClinicalLabCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="clinical-labs"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Mindfulness & Mental Health */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Mindfulness & Mental Health
              </h2>
              <HorizontalCardList
                items={getMindfulnessCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="mindfulness"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Smart Home & Environment */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Smart Home & Environment
              </h2>
              <HorizontalCardList
                items={getSmartHomeCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="smart-home"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Mail, Calendar & Contacts */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Mail, Calendar & Contacts
              </h2>
              <HorizontalCardList
                items={getCommunicationCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="communication"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Music & Video */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5" />
                Music & Video
              </h2>
              <HorizontalCardList
                items={getEntertainmentMediaCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="entertainment-media"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Wallet & Payments */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet & Payments
              </h2>
              <HorizontalCardList
                items={getWalletPaymentsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="wallet-payments"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Developer & Pro Tools */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Braces className="w-5 h-5" />
                Developer & Pro Tools
              </h2>
              <HorizontalCardList
                items={getDeveloperToolsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="developer-tools"
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
                <Calendar className="w-5 h-5" />
                Productivity & Calendar
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

            {/* Music & Video */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5" />
                Music & Video
              </h2>
              <HorizontalCardList
                items={getEntertainmentMediaCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="entertainment-media-available"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Wellness & Fitness Integrations */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Wellness & Fitness Integrations
              </h2>
              <HorizontalCardList
                items={getWellnessFitnessIntegrationsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="wellness-fitness-integrations"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Nutrition & Lifestyle */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Apple className="w-5 h-5" />
                Nutrition & Lifestyle
              </h2>
              <HorizontalCardList
                items={getNutritionLifestyleCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="nutrition-lifestyle"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Clinical & Labs */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Clinical & Labs
              </h2>
              <HorizontalCardList
                items={getClinicalLabsIntegrationsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="clinical-labs-integrations"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Mental Health & Mindfulness */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Mental Health & Mindfulness
              </h2>
              <HorizontalCardList
                items={getMentalHealthMindfulnessCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="mental-health-mindfulness"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Smart Home & Environment */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Smart Home & Environment
              </h2>
              <HorizontalCardList
                items={getSmartHomeEnvironmentCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="smart-home-environment"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Communication Apps */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Communication Apps
              </h2>
              <HorizontalCardList
                items={getCommunicationAppsIntegrationsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="communication-apps-integrations"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Wallet & Payments */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Wallet & Payments
              </h2>
              <HorizontalCardList
                items={getWalletPaymentsIntegrationsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="wallet-payments-integrations"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>

            {/* Developer Tools */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Braces className="w-5 h-5" />
                Developer Tools
              </h2>
              <HorizontalCardList
                items={getDeveloperToolsIntegrationsCards()}
                variant="standard"
                layout="stack"
                screenId="settings-connected-apps"
                listId="developer-tools-integrations"
                gap="md"
                infiniteScroll={false}
                className="pb-2"
              />
            </div>
          </div>
        </SplitBarContent>

        {/* Tab 3: Data Sync */}
        <SplitBarContent value="sync">
          {(() => {
            const [syncFilter, setSyncFilter] = useState('all');
            
            return (
              <div className="space-y-6">
                
                {/* Section 1: Sync Overview */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Sync Overview
                  </h2>
                  <HorizontalCardList
                    items={[getSyncOverviewCard()]}
                    variant="standard"
                    layout="stack"
                    screenId="settings-connected-apps"
                    listId="sync-overview"
                    gap="md"
                    infiniteScroll={false}
                    className="pb-2"
                  />
                </div>

                {/* Section 2: App Sync Details */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <ListChecks className="w-5 h-5" />
                    App Sync Details
                  </h2>
                  <HorizontalCardList
                    items={getPerAppSyncCards()}
                    variant="standard"
                    layout="stack"
                    screenId="settings-connected-apps"
                    listId="per-app-sync"
                    gap="md"
                    infiniteScroll={false}
                    className="pb-2"
                  />
                </div>

                {/* Section 3: Sync Activity Log */}
                <div>
                  {/* Filter Bar */}
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Sync Activity Log
                    </h2>
                    <div className="flex items-center gap-4 text-sm">
                      <button 
                        onClick={() => setSyncFilter('all')}
                        className={`pb-1 transition-colors ${
                          syncFilter === 'all' 
                            ? 'font-medium border-b-2 border-primary text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setSyncFilter('today')}
                        className={`pb-1 transition-colors ${
                          syncFilter === 'today' 
                            ? 'font-medium border-b-2 border-primary text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Today
                      </button>
                      <button 
                        onClick={() => setSyncFilter('last7days')}
                        className={`pb-1 transition-colors ${
                          syncFilter === 'last7days' 
                            ? 'font-medium border-b-2 border-primary text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Last 7 Days
                      </button>
                      <button 
                        onClick={() => setSyncFilter('errors')}
                        className={`pb-1 transition-colors ${
                          syncFilter === 'errors' 
                            ? 'font-medium border-b-2 border-primary text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Errors Only
                      </button>
                    </div>
                  </div>
                  <HorizontalCardList
                    items={[getSyncHistoryCard(syncFilter)]}
                    variant="standard"
                    layout="stack"
                    screenId="settings-connected-apps"
                    listId="sync-history"
                    gap="md"
                    infiniteScroll={false}
                    className="pb-2"
                  />
                </div>

              </div>
            );
          })()}
        </SplitBarContent>

        <SplitBarContent value="agent-ingest">
          <VaeaChannelsPanel />
        </SplitBarContent>
      </SplitBar>
        </div>
      </div>

      <ConnectAppPopup
        isOpen={actionPopupOpen}
        onClose={() => setActionPopupOpen(false)}
      />

      {/* VTID-02403: AI Assistant paste-key modal */}
      <AIAssistantConnectModal
        open={aiModalProvider !== null}
        provider={aiModalProvider}
        onClose={() => setAiModalProvider(null)}
      />

      {/* VTID-01928: Google connection live verification */}
      <GoogleConnectionVerifyDialog
        open={googleVerifyOpen}
        onOpenChange={setGoogleVerifyOpen}
      />
    </AppLayout>
  );
}

export default withScreenId(ConnectedApps, SCREEN_IDS.SETTINGS_CONNECTED_APPS);
