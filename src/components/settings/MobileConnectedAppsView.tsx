import { useState } from "react";
import { Plus, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { useTranslation } from "@/hooks/useTranslation";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { ConnectAppPopup } from "@/components/ConnectAppPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

import { MobileIntegrationSection } from "./MobileIntegrationSection";
import { VaeaChannelsPanel } from "@/components/business/vaea/VaeaChannelsPanel";
import { MobileIntegrationDetailSheet } from "./MobileIntegrationDetailSheet";
import { MobileConnectionSummary } from "./MobileConnectionSummary";
import {
  socialIntegrations,
  fitnessIntegrations,
  healthIntegrations,
  otherIntegrations,
  aiAssistantsIntegrations,
  productivityIntegrations,
  mediaIntegrations,
  getConnectionStats,
  type Integration,
} from "./integrationData";
// VTID-02403: AI Assistants hooks + modal for mobile
import { useAIProviders, type AIProviderId } from "@/hooks/useAIAssistants";
import { AIAssistantConnectModal } from "@/components/AIAssistantConnectModal";
// VTID-01928: Google OAuth for Gmail/Calendar/Contacts, and dedicated YouTube
// OAuth for YouTube / YouTube Music (narrower scope).
import {
  useStartGoogleConnect,
  useStartYouTubeConnect,
  useSocialConnections,
  GOOGLE_CONNECTOR_IDS,
  YOUTUBE_CONNECTOR_IDS,
} from "@/hooks/useGoogleConnect";
import { GoogleConnectionVerifyDialog } from "@/components/settings/GoogleConnectionVerifyDialog";
import { SessionExpiredBanner } from "@/components/settings/SessionExpiredBanner";
import { OAuthBouncePendingOverlay } from "@/components/settings/OAuthBouncePendingOverlay";
import { ToastAction } from "@/components/ui/toast";
import { useEffect } from "react";

// Social platform icons for the import dialog
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { XIcon } from "@/components/icons/XIcon";
import { notify, notifyError, t } from '@/lib/i18n-toast';

type SocialPlatform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

const socialPlatformConfig: Record<SocialPlatform, { icon: React.ReactNode; name: string }> = {
  linkedin: { icon: <LinkedInIcon className="h-6 w-6" />, name: 'LinkedIn' },
  instagram: { icon: <InstagramIcon className="h-6 w-6" />, name: 'Instagram' },
  tiktok: { icon: <TikTokIcon className="h-6 w-6" />, name: 'TikTok' },
  youtube: { icon: <YouTubeIcon className="h-6 w-6" />, name: 'YouTube' },
  facebook: { icon: <FacebookIcon className="h-6 w-6" />, name: 'Facebook' },
  x: { icon: <XIcon className="h-6 w-6" />, name: 'X (Twitter)' },
};

const socialPlatformIds = ['linkedin', 'instagram', 'tiktok', 'youtube', 'facebook', 'x'];

export function MobileConnectedAppsView() {
  const { translate } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();

  const [selectedApp, setSelectedApp] = useState<Integration | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectPopupOpen, setConnectPopupOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const connectorModes: ModeOption[] = [
    { value: 'all', label: translate('connectedApps.sections.all', 'All'), icon: '🔌' },
    { value: 'ai', label: 'AI', icon: '✨' },
    { value: 'productivity', label: translate('connectedApps.sections.productivity', 'Mail & Calendar'), icon: '📅' },
    { value: 'media', label: translate('connectedApps.sections.media', 'Music & Video'), icon: '🎵' },
    { value: 'social', label: translate('connectedApps.sections.social', 'Social'), icon: '📱' },
    { value: 'fitness', label: translate('connectedApps.sections.fitness', 'Fitness'), icon: '💪' },
    { value: 'health', label: translate('connectedApps.sections.health', 'Health'), icon: '🏥' },
    { value: 'other', label: translate('connectedApps.sections.other', 'Other'), icon: '🔧' },
    { value: 'agent', label: translate('connectedApps.sections.agent', 'Autopilot'), icon: '📡' },
  ];

  // VTID-02403: Live AI providers (tenant-aware status)
  const { data: aiProvidersData = [] } = useAIProviders();
  const [aiModalProvider, setAiModalProvider] = useState<AIProviderId | null>(null);

  // VTID-01928: Google connector state + dedicated YouTube connection.
  const { data: socialConnections = [], error: socialConnectionsError } = useSocialConnections();
  const startGoogle = useStartGoogleConnect();
  const startYouTube = useStartYouTubeConnect();
  const googleConnection = socialConnections.find((c) => c.provider === "google");
  const googleConnected = Boolean(googleConnection);
  const youtubeConnection = socialConnections.find((c) => c.provider === "youtube");
  const youtubeConnected = Boolean(youtubeConnection);
  const [googleVerifyOpen, setGoogleVerifyOpen] = useState(false);

  // Surface a toast when returning from the OAuth callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const errorCode = params.get("error");
    const provider = params.get("provider");
    if (connected === "google") {
      const username = params.get("username") || "";
      notify('toasts.settings.googleConnected');
      params.delete("connected");
      params.delete("username");
      const cleaned = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (cleaned ? `?${cleaned}` : ""));
    } else if (connected === "youtube") {
      const username = params.get("username") || "";
      notify('toasts.settings.youtubeConnected');
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

  // Social media import dialog state
  const [socialImportOpen, setSocialImportOpen] = useState(false);
  const [socialImportPlatform, setSocialImportPlatform] = useState<SocialPlatform>('linkedin');

  const { connected, syncing } = getConnectionStats();

  // Filter integrations by search query
  const filterIntegrations = (integrations: Integration[]) => {
    if (!searchQuery.trim()) return integrations;
    const query = searchQuery.toLowerCase();
    return integrations.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.syncData.toLowerCase().includes(query)
    );
  };

  // VTID-02403: Merge live AI status into static AI integrations list
  const aiIntegrationsLive: Integration[] = aiAssistantsIntegrations.map((base) => {
    const live = aiProvidersData.find((p) => p.provider === base.id);
    if (!live) return base;
    return {
      ...base,
      connected: live.status === "connected",
      comingSoon: live.status === "disabled",
      lastSync: live.last_verified_at || undefined,
    };
  });

  // VTID-01928: paint the Connected badge on every OAuth-backed integration
  // — Google (Gmail, Calendar, Contacts) uses the bundled google connection,
  // YouTube and YouTube Music use the dedicated youtube connection.
  const applyGoogleStatus = (integrations: Integration[]): Integration[] =>
    integrations.map((integration) => {
      if (GOOGLE_CONNECTOR_IDS.has(integration.id) && googleConnected) {
        return {
          ...integration,
          connected: true,
          lastSync: googleConnection?.connected_at,
        };
      }
      if (YOUTUBE_CONNECTOR_IDS.has(integration.id) && youtubeConnected) {
        return {
          ...integration,
          connected: true,
          lastSync: youtubeConnection?.connected_at,
        };
      }
      return integration;
    });

  const filteredAi = filterIntegrations(aiIntegrationsLive);
  const filteredSocial = filterIntegrations(socialIntegrations);
  const filteredFitness = filterIntegrations(fitnessIntegrations);
  const filteredHealth = filterIntegrations(healthIntegrations);
  const filteredProductivity = filterIntegrations(applyGoogleStatus(productivityIntegrations));
  const filteredMedia = filterIntegrations(applyGoogleStatus(mediaIntegrations));
  const filteredOther = filterIntegrations(otherIntegrations);

  // Handle connect action
  const handleConnect = (integration: Integration) => {
    // VTID-02403: AI Assistants open the paste-key modal
    if (integration.category === 'ai' && (integration.id === 'chatgpt' || integration.id === 'claude')) {
      setAiModalProvider(integration.id as AIProviderId);
      return;
    }
    // VTID-01928: Google connectors initiate OAuth via gateway,
    // or open the live-verification dialog if already connected.
    if (GOOGLE_CONNECTOR_IDS.has(integration.id)) {
      if (integration.connected || googleConnected) {
        setGoogleVerifyOpen(true);
        return;
      }
      startGoogle.mutate(undefined, {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          notifyError('toasts.settings.couldnTStartGoogleSignin');
        },
      });
      return;
    }
    // YouTube / YouTube Music go through the dedicated YouTube OAuth so users
    // don't get the full Mail/Calendar/Contacts consent screen.
    if (YOUTUBE_CONNECTOR_IDS.has(integration.id)) {
      if (integration.connected || youtubeConnected) {
        toast({
          title: integration.name,
          description: `Linked to ${youtubeConnection?.username ?? youtubeConnection?.display_name ?? "your YouTube account"}.`,
        });
        return;
      }
      startYouTube.mutate(undefined, {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          notifyError('toasts.settings.couldnTStartYoutubeSignin');
        },
      });
      return;
    }
    // Check if it's a social platform
    if (socialPlatformIds.includes(integration.id)) {
      setSocialImportPlatform(integration.id as SocialPlatform);
      setSocialImportOpen(true);
    } else {
      // For non-social apps, show placeholder toast
      toast({
        title: translate('connectedApps.actions.connect'),
        description: translate('connectedApps.popup.connectionPlaceholder').replace('{appName}', integration.name),
      });
    }
  };

  // Handle disconnect action
  const handleDisconnect = (integration: Integration) => {
    toast({
      title: translate('connectedApps.actions.disconnect'),
      description: `${integration.name} ${translate('connectedApps.popup.connectionPlaceholder').replace('{appName}', '')}`,
    });
  };

  // Handle configure action
  const handleConfigure = (integration: Integration) => {
    toast({
      title: translate('connectedApps.actions.configure'),
      description: integration.name,
    });
  };

  // Handle successful social import
  const handleSocialImportSuccess = () => {
    refreshProfile();
    toast({
      title: translate('connectedApps.popup.connectionSuccess'),
      description: socialPlatformConfig[socialImportPlatform].name,
    });
  };

  const currentPlatformConfig = socialPlatformConfig[socialImportPlatform];

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
      <div className="p-4 pb-32 space-y-3">
        {/* Header */}
        <StandardHeader
          title={translate('connectedApps.title')}
          description={translate('connectedApps.description')}
        />

        <SessionExpiredBanner error={socialConnectionsError} />

        {/* Action Bar */}
        <UtilityActionButton
          compact
          className="min-w-0"
          afterGiftVoucherChildren={
            <>
              <VitanaIndexChip />
              <AutopilotChip
                pendingCount={0}
                onClick={() => setAutopilotOpen(true)}
              />
            </>
          }
        >
          <div className="flex items-center gap-2 min-w-max">
            <ExpandableSearchButton
              placeholder={translate('connectedApps.searchPlaceholder')}
              onSearch={setSearchQuery}
            />
            <MobileModePill
              modes={connectorModes}
              activeMode={activeCategory}
              onModeChange={setActiveCategory}
            />
            <UniversalCalendarButton />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              onClick={() => setConnectPopupOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {translate('connectedApps.addApp')}
            </Button>
          </div>
        </UtilityActionButton>

        {/* Connection Summary */}
        <MobileConnectionSummary
          connectedCount={connected}
          syncingCount={syncing}
        />

        {/* Integration Sections */}
        <div className="space-y-3">
          {/* VTID-02403: AI Assistants (ChatGPT + Claude) */}
          {(activeCategory === 'all' || activeCategory === 'ai') && filteredAi.length > 0 && (
            <MobileIntegrationSection
              title={t('screens.settings.aiAssistants')}
              emoji="✨"
              integrations={filteredAi}
              onSelect={setSelectedApp}
            />
          )}

          {/* Mail, Calendar & Contacts — Gmail, Google Calendar, Apple Mail, iPhone/Android Contacts, Outlook */}
          {(activeCategory === 'all' || activeCategory === 'productivity') && filteredProductivity.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.productivity', 'Mail, Calendar & Contacts')}
              emoji="📅"
              integrations={filteredProductivity}
              onSelect={setSelectedApp}
            />
          )}

          {/* Music & Video — Spotify, YouTube, YouTube Music, Apple Music */}
          {(activeCategory === 'all' || activeCategory === 'media') && filteredMedia.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.media', 'Music & Video')}
              emoji="🎵"
              integrations={filteredMedia}
              onSelect={setSelectedApp}
            />
          )}

          {(activeCategory === 'all' || activeCategory === 'social') && filteredSocial.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.social')}
              emoji="📱"
              integrations={filteredSocial}
              onSelect={setSelectedApp}
            />
          )}

          {(activeCategory === 'all' || activeCategory === 'fitness') && filteredFitness.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.fitness')}
              emoji="💪"
              integrations={filteredFitness}
              onSelect={setSelectedApp}
            />
          )}

          {(activeCategory === 'all' || activeCategory === 'health') && filteredHealth.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.health')}
              emoji="🩺"
              integrations={filteredHealth}
              onSelect={setSelectedApp}
            />
          )}

          {(activeCategory === 'all' || activeCategory === 'other') && filteredOther.length > 0 && (
            <MobileIntegrationSection
              title={translate('connectedApps.sections.other')}
              emoji="🔧"
              integrations={filteredOther}
              onSelect={setSelectedApp}
              defaultExpanded={false}
            />
          )}

          {(activeCategory === 'all' || activeCategory === 'agent') && (
            <VaeaChannelsPanel />
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <MobileIntegrationDetailSheet
        integration={selectedApp}
        onClose={() => setSelectedApp(null)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onConfigure={handleConfigure}
      />

      {/* Connect App Popup */}
      <ConnectAppPopup
        isOpen={connectPopupOpen}
        onClose={() => setConnectPopupOpen(false)}
        onConnect={handleConnect}
      />

      {/* Autopilot Popup */}
      <AutopilotPopup
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />

      {/* Social Media Import Dialog */}
      <SocialMediaImportDialog
        open={socialImportOpen}
        onOpenChange={setSocialImportOpen}
        platform={socialImportPlatform}
        platformName={currentPlatformConfig.name}
        icon={currentPlatformConfig.icon}
        profileId={user?.id || ''}
        onSuccess={handleSocialImportSuccess}
      />

      {/* VTID-02403: AI Assistant Connect Modal */}
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

      {/* In-app overlay shown while user is bounced to system browser
          for OAuth, so the button never feels dead. */}
      <OAuthBouncePendingOverlay />
    </div>
  );
}
