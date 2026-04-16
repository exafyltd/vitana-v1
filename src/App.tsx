import { useEffect, useState, lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner"; // Global toast provider
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantDetector } from "@/components/TenantDetector";
import PresenceDebugPanel from "@/components/debug/PresenceDebugPanel";

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthGuard from "@/components/AuthGuard";
import { DevAuthGuard } from "@/components/dev/DevAuthGuard";
import { DevErrorBoundary } from "@/components/dev/DevErrorBoundary";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { RTLProvider } from "@/components/RTLProvider";
import { MeetupSelectionProvider } from "@/context/MeetupSelectionContext";
import { EventSelectionProvider } from "@/context/EventSelectionContext";
import { IntelligentGreetingProvider } from "@/context/IntelligentGreetingProvider";
import { StreamingStateProvider, useStreamingState } from "@/context/StreamingStateContext";
import { ProfilePreviewProvider } from "@/hooks/useProfilePreview";
import { VitanalandNavigationProvider } from "@/context/VitanalandNavigationContext";
import { SoundscapeProvider } from "@/context/SoundscapeContext";
import { MobileMuteButton } from "@/components/audio/MobileMuteButton";
import { SoundscapeResumeBanner } from "@/components/mobile/SoundscapeResumeBanner";
import { MiniAudioPlayer } from "@/components/MiniAudioPlayer";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useAudioPriority } from "@/hooks/useAudioPriority";
import { useAppilix } from "@/hooks/useAppilix";
import { registerAppilixIdentity, ensureAppilixIdentity } from "@/lib/appilix";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { initializePushNotifications } from "@/lib/pushNotifications";
import { useOrbVoiceWidget } from "@/hooks/useOrbVoiceWidget";
import { OrbConsentPlaceholder } from "@/components/audio/OrbConsentPlaceholder";
import LegacyProfileRedirect from "./components/LegacyProfileRedirect";
import MilestoneCelebration from "./components/MilestoneCelebration";

// Route loading fallback
const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-muted" />
      <div className="h-3 w-24 rounded bg-muted" />
    </div>
  </div>
);

// ─── Eager imports: shell-critical pages (auth, entry, public landing) ───
import Index from "./pages/Index";
import ShareEntry from "./pages/ShareEntry";
// Auth.tsx removed — login flows handled by tenant portals
import NotFound from "./pages/NotFound";

// ─── Lazy imports: everything else, grouped by domain ───

// Auth & Legal
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/legal/TermsOfUse"));
const DeleteAccount = lazy(() => import("./pages/legal/DeleteAccount"));
const MaxinaSupport = lazy(() => import("./pages/legal/MaxinaSupport"));
const IntroExperience = lazy(() => import("./pages/IntroExperience"));
const RedeemVoucher = lazy(() => import("./pages/RedeemVoucher"));
const CreatorOnboarded = lazy(() => import("./pages/CreatorOnboarded"));
const Logout = lazy(() => import("./pages/Logout"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const EmailConfirmed = lazy(() => import("./pages/auth/EmailConfirmed"));
const OnboardingWelcome = lazy(() => import("./pages/onboarding/OnboardingWelcome"));

// Portal pages
const ExafyAdminPortal = lazy(() => import("./pages/portals/ExafyAdminPortal"));
const MaxinaPortal = lazy(() => import("./pages/portals/MaxinaPortal"));
const AlkalmaPortal = lazy(() => import("./pages/portals/AlkalmaPortal"));
const EarthlinksPortal = lazy(() => import("./pages/portals/EarthlinksPortal"));
// CommunityPortal removed — orphaned, login handled by tenant portals
const MaxinaConfirmed = lazy(() => import("./pages/portals/MaxinaConfirmed"));
const AlkalmaConfirmed = lazy(() => import("./pages/portals/AlkalmaConfirmed"));
const EarthlinksConfirmed = lazy(() => import("./pages/portals/EarthlinksConfirmed"));
// CommunityConfirmed removed — orphaned parent deleted

// Dev Hub
const DevLogin = lazy(() => import("./pages/dev/DevLogin"));
const DevDashboard = lazy(() => import("./pages/dev/DevDashboard"));
const DevSettings = lazy(() => import("./pages/dev/DevSettings"));
const DevCommand = lazy(() => import("./pages/dev/DevCommand"));
const DevAgents = lazy(() => import("./pages/dev/DevAgents"));
const DevPipelines = lazy(() => import("./pages/dev/DevPipelines"));
const DevOasis = lazy(() => import("./pages/dev/DevOasis"));
const DevVTID = lazy(() => import("./pages/dev/DevVTID"));
const DevGateway = lazy(() => import("./pages/dev/DevGateway"));
const DevCICD = lazy(() => import("./pages/dev/DevCICD"));
const DevObservability = lazy(() => import("./pages/dev/DevObservability"));
const DevDocs = lazy(() => import("./pages/dev/DevDocs"));
const DevLayout = lazy(() => import("./layouts/DevLayout"));
const DashboardAIFeed = lazy(() => import("./pages/dev/dashboard/AIFeed"));
const DashboardAlerts = lazy(() => import("./pages/dev/dashboard/Alerts"));
const DashboardSystemHealth = lazy(() => import("./pages/dev/dashboard/SystemHealth"));
const CommandApprovals = lazy(() => import("./pages/dev/command/Approvals"));
const CommandHistory = lazy(() => import("./pages/dev/command/History"));
const CommandCompose = lazy(() => import("./pages/dev/command/Compose"));
const AgentsWorker = lazy(() => import("./pages/dev/agents/Worker"));
const AgentsValidator = lazy(() => import("./pages/dev/agents/Validator"));
const AgentsQATest = lazy(() => import("./pages/dev/agents/QATest"));
const AgentsCrewTemplate = lazy(() => import("./pages/dev/agents/CrewTemplate"));
const VTIDIssue = lazy(() => import("./pages/dev/vtid/Issue"));
const VTIDAnalytics = lazy(() => import("./pages/dev/vtid/Analytics"));
const VTIDSearch = lazy(() => import("./pages/dev/vtid/Search"));
const GatewayRequests = lazy(() => import("./pages/dev/gateway/Requests"));
const GatewayMobileLinks = lazy(() => import("./pages/dev/gateway/MobileLinks"));
const GatewayWebhooks = lazy(() => import("./pages/dev/gateway/Webhooks"));
const OasisState = lazy(() => import("./pages/dev/oasis/State"));
const OasisLedger = lazy(() => import("./pages/dev/oasis/Ledger"));
const OasisPolicies = lazy(() => import("./pages/dev/oasis/Policies"));
const PipelinesTests = lazy(() => import("./pages/dev/pipelines/Tests"));
const PipelinesCanary = lazy(() => import("./pages/dev/pipelines/Canary"));
const PipelinesRollbacks = lazy(() => import("./pages/dev/pipelines/Rollbacks"));
const CICDRuns = lazy(() => import("./pages/dev/cicd/Runs"));
const CICDArtifacts = lazy(() => import("./pages/dev/cicd/Artifacts"));
const CICDMatrix = lazy(() => import("./pages/dev/cicd/Matrix"));
const ObservabilityTraces = lazy(() => import("./pages/dev/observability/Traces"));
const ObservabilityMetrics = lazy(() => import("./pages/dev/observability/Metrics"));
const ObservabilityCosts = lazy(() => import("./pages/dev/observability/Costs"));
const SettingsAuth = lazy(() => import("./pages/dev/settings/Auth"));
const SettingsFlags = lazy(() => import("./pages/dev/settings/Flags"));
const SettingsTenants = lazy(() => import("./pages/dev/settings/Tenants"));

// Main feature pages
const Home = lazy(() => import("./pages/Home"));
const Discover = lazy(() => import("./pages/Discover"));
const Health = lazy(() => import("./pages/Health"));
const Community = lazy(() => import("./pages/Community"));
const AI = lazy(() => import("./pages/AI"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/Settings"));
const MobileSettings = lazy(() => import("./pages/MobileSettings"));
const Profile = lazy(() => import("./pages/Profile"));
const Search = lazy(() => import("./pages/Search"));
const Cart = lazy(() => import("./pages/Cart"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const TicketPurchaseSuccess = lazy(() => import("./pages/TicketPurchaseSuccess"));
const PackagePurchaseSuccess = lazy(() => import("./pages/PackagePurchaseSuccess"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const TicketDemo = lazy(() => import("./pages/TicketDemo"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Sharing = lazy(() => import("./pages/Sharing"));
const Memory = lazy(() => import("./pages/Memory"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const PublicEventLanding = lazy(() => import("./pages/PublicEventLanding"));
const PublicCampaignLanding = lazy(() => import("./pages/PublicCampaignLanding"));
const AutopilotDashboard = lazy(() => import("./pages/AutopilotDashboard"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));
const MobileDailyDiary = lazy(() => import("./pages/MobileDailyDiary"));
const Supplements = lazy(() => import("./pages/discover/Supplements"));
const ProductDetail = lazy(() => import("./pages/discover/ProductDetail"));
const BusinessHub = lazy(() => import("./pages/BusinessHub"));
const AIAssistant = lazy(() => import("./pages/assistant/AIAssistant"));

// VTID-01900: Home sub-pages removed — Home is now a standalone News Feed

// Discover sub-pages
const WellnessServices = lazy(() => import("./pages/discover/WellnessServices"));
const DoctorsCoaches = lazy(() => import("./pages/discover/DoctorsCoaches"));
const ProviderProfile = lazy(() => import("./pages/discover/ProviderProfile"));
const DealsOffers = lazy(() => import("./pages/discover/DealsOffers"));
const Orders = lazy(() => import("./pages/discover/Orders"));
const AIPicksPage = lazy(() => import("./pages/discover/AIPicksPage"));

// Health sub-pages
const PillarsOfHealth = lazy(() => import("./pages/health/PillarsOfHealth"));
const HealthWellnessServices = lazy(() => import("./pages/health/WellnessServices"));
const ConditionsRisks = lazy(() => import("./pages/health/ConditionsRisks"));
const EducationResources = lazy(() => import("./pages/health/EducationResources"));
const MyBiology = lazy(() => import("./pages/health/MyBiology"));
const Plans = lazy(() => import("./pages/health/Plans"));

// Community sub-pages
const EventsAndMeetups = lazy(() => import("./pages/community/EventsAndMeetups"));
const Groups = lazy(() => import("./pages/community/Groups"));
const GroupDetail = lazy(() => import("./pages/community/GroupDetail"));
const MediaHub = lazy(() => import("./pages/community/MediaHub"));
const LiveRooms = lazy(() => import("./pages/community/LiveRooms"));
const LiveRoomViewer = lazy(() => import("./pages/community/LiveRoomViewer"));

// AI sub-pages
const Insights = lazy(() => import("./pages/ai/Insights"));
const AIRecommendations = lazy(() => import("./pages/ai/AIRecommendations"));
const DailySummary = lazy(() => import("./pages/ai/DailySummary"));
const Companion = lazy(() => import("./pages/ai/Companion"));

// Messages sub-pages
const Archived = lazy(() => import("./pages/messages/Archived"));
const Reminder = lazy(() => import("./pages/messages/Reminder"));
const Inspiration = lazy(() => import("./pages/messages/Inspiration"));

// Settings sub-pages
const Privacy = lazy(() => import("./pages/settings/Privacy"));
const SettingsNotifications = lazy(() => import("./pages/settings/SettingsNotifications"));
const Preferences = lazy(() => import("./pages/settings/Preferences"));
const ConnectedApps = lazy(() => import("./pages/settings/ConnectedApps"));
const Billing = lazy(() => import("./pages/settings/Billing"));
const Support = lazy(() => import("./pages/settings/Support"));
const TenantRole = lazy(() => import("./pages/settings/TenantRole"));
const SocialConnect = lazy(() => import("./pages/settings/SocialConnect"));

// Wallet sub-pages
const Balance = lazy(() => import("./pages/wallet/Balance"));
const Subscriptions = lazy(() => import("./pages/wallet/Subscriptions"));
const Rewards = lazy(() => import("./pages/wallet/Rewards"));

// Sharing sub-pages
const Distribution = lazy(() => import("./pages/sharing/Distribution"));
const DataConsent = lazy(() => import("./pages/sharing/DataConsent"));
const Campaigns = lazy(() => import("./pages/sharing/Campaigns"));
const CampaignDetail = lazy(() => import("./pages/sharing/CampaignDetail"));

// Memory sub-pages
const Timeline = lazy(() => import("./pages/memory/Timeline"));
const Recall = lazy(() => import("./pages/memory/Recall"));
const MemoryPermissions = lazy(() => import("./pages/memory/Permissions"));
const Diary = lazy(() => import("./pages/memory/Diary"));

// Role-specific dashboards
const PatientDashboard = lazy(() => import("./pages/patient/Dashboard"));
const PatientHealth = lazy(() => import("./pages/patient/Health"));
const PatientAppointments = lazy(() => import("./pages/patient/Appointments"));
const ProfessionalDashboard = lazy(() => import("./pages/professional/Dashboard"));
const ProfessionalPatients = lazy(() => import("./pages/professional/Patients"));
const StaffDashboard = lazy(() => import("./pages/staff/Dashboard"));
const StaffQueue = lazy(() => import("./pages/staff/Queue"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
// Overview Dashboard (replaces legacy dashboard)
const OverviewDashboard = lazy(() => import("./pages/admin/overview/Dashboard"));
const OverviewActivity = lazy(() => import("./pages/admin/overview/Activity"));
const OverviewAlerts = lazy(() => import("./pages/admin/overview/Alerts"));
const OverviewHealth = lazy(() => import("./pages/admin/overview/Health"));

// Admin sub-pages (legacy — kept for backward-compat)
const AdminDashboardHealth = lazy(() => import("./pages/admin/dashboard/SystemHealth"));
const AdminDashboardActivity = lazy(() => import("./pages/admin/dashboard/ActivityFeed"));
// Legacy user stubs (kept for backward-compat redirects)
const AdminAllUsers = lazy(() => import("./pages/admin/users/AllUsers"));
const AdminSignupFunnel = lazy(() => import("./pages/admin/users/SignupFunnel"));
const AdminInvitations = lazy(() => import("./pages/admin/users/Invitations"));
const AdminRolesAccess = lazy(() => import("./pages/admin/users/RolesAccess"));
// Batch 1.B1: New Members section pages
const MembersDirectory = lazy(() => import("./pages/admin/members/Directory"));
const MembersInvitations = lazy(() => import("./pages/admin/members/Invitations"));
const MembersRolesAccess = lazy(() => import("./pages/admin/members/RolesAccess"));
const MembersSegments = lazy(() => import("./pages/admin/members/Segments"));
const MembersAudit = lazy(() => import("./pages/admin/members/Audit"));
// Batch 1.B2: Assistant section pages
const AssistantPersonality = lazy(() => import("./pages/admin/assistant/Personality"));
const AssistantVoice = lazy(() => import("./pages/admin/assistant/Voice"));
const AssistantTools = lazy(() => import("./pages/admin/assistant/Tools"));
const AssistantRouting = lazy(() => import("./pages/admin/assistant/Routing"));
const AssistantPlayground = lazy(() => import("./pages/admin/assistant/Playground"));
const AssistantSessions = lazy(() => import("./pages/admin/assistant/Sessions"));
// Batch 1.B2: Knowledge section pages
const KnowledgeDocuments = lazy(() => import("./pages/admin/knowledge/Documents"));
const KnowledgeTopics = lazy(() => import("./pages/admin/knowledge/Topics"));
const KnowledgeIndexing = lazy(() => import("./pages/admin/knowledge/Indexing"));
const KnowledgeSearchTest = lazy(() => import("./pages/admin/knowledge/SearchTest"));
const KnowledgeGovernance = lazy(() => import("./pages/admin/knowledge/Governance"));
// Settings section pages
const SettingsProfile = lazy(() => import("./pages/admin/settings/Profile"));
const SettingsBranding = lazy(() => import("./pages/admin/settings/Branding"));
const SettingsFeatureFlags = lazy(() => import("./pages/admin/settings/FeatureFlags"));
const SettingsIntegrations = lazy(() => import("./pages/admin/settings/Integrations"));
const SettingsDomains = lazy(() => import("./pages/admin/settings/Domains"));
const SettingsBilling = lazy(() => import("./pages/admin/settings/Billing"));
// Audit & Compliance section pages
const AuditActions = lazy(() => import("./pages/admin/audit/Actions"));
const AuditAccess = lazy(() => import("./pages/admin/audit/Access"));
const AuditOasisEvents = lazy(() => import("./pages/admin/audit/OasisEvents"));
const AuditPolicies = lazy(() => import("./pages/admin/audit/Policies"));
const AuditDataRights = lazy(() => import("./pages/admin/audit/DataRights"));
// Wave 2: Community section
const CommunityReported = lazy(() => import("./pages/admin/community/ReportedContentNew"));
const CommunityMeetups = lazy(() => import("./pages/admin/community/Meetups"));
const CommunityLiveRooms = lazy(() => import("./pages/admin/community/LiveRooms"));
const CommunityGroups = lazy(() => import("./pages/admin/community/GroupsNew"));
const CommunityCreators = lazy(() => import("./pages/admin/community/Creators"));
// Wave 2: Content section
const ContentVideos = lazy(() => import("./pages/admin/content/Videos"));
const ContentPodcasts = lazy(() => import("./pages/admin/content/Podcasts"));
const ContentMusic = lazy(() => import("./pages/admin/content/Music"));
const ContentUploads = lazy(() => import("./pages/admin/content/Uploads"));
const ContentAnalytics = lazy(() => import("./pages/admin/content/ContentAnalytics"));
// Wave 2: Notifications section
const NotificationsCompose = lazy(() => import("./pages/admin/notifications/ComposeNew"));
const NotificationsTemplates = lazy(() => import("./pages/admin/notifications/Templates"));
const NotificationsSent = lazy(() => import("./pages/admin/notifications/SentNew"));
const NotificationsSubscriptions = lazy(() => import("./pages/admin/notifications/Subscriptions"));
const NotificationsProviders = lazy(() => import("./pages/admin/notifications/Providers"));
const NotificationsCategories = lazy(() => import("./pages/admin/notifications/Categories"));
// Wave 2: Insights section
const InsightsGrowth = lazy(() => import("./pages/admin/insights/Growth"));
const InsightsEngagement = lazy(() => import("./pages/admin/insights/Engagement"));
const InsightsAssistantUsage = lazy(() => import("./pages/admin/insights/AssistantUsage"));
const InsightsAutopilotImpact = lazy(() => import("./pages/admin/insights/AutopilotImpact"));
const InsightsReports = lazy(() => import("./pages/admin/insights/Reports"));
const AdminNotificationsCompose = lazy(() => import("./pages/admin/notifications/Compose"));
const AdminNotificationsSentLog = lazy(() => import("./pages/admin/notifications/SentLog"));
const AdminNotificationsPreferences = lazy(() => import("./pages/admin/notifications/Preferences"));
const AdminLiveSessions = lazy(() => import("./pages/admin/live/Sessions"));
const AdminLiveAttendance = lazy(() => import("./pages/admin/live/Attendance"));
const AdminIntelligenceMemory = lazy(() => import("./pages/admin/intelligence/Memory"));
const AdminIntelligenceEmbeddings = lazy(() => import("./pages/admin/intelligence/Embeddings"));
const AdminIntelligenceSignals = lazy(() => import("./pages/admin/intelligence/Signals"));
const AdminIntelligenceRelationships = lazy(() => import("./pages/admin/intelligence/Relationships"));
const AdminSystemConfiguration = lazy(() => import("./pages/admin/system/Configuration"));
const AdminSystemCreators = lazy(() => import("./pages/admin/system/Creators"));
const AdminAuditEvents = lazy(() => import("./pages/admin/audit/Events"));
const AdminAuditUserActivity = lazy(() => import("./pages/admin/audit/UserActivity"));
const AdminAuditApiMonitor = lazy(() => import("./pages/admin/audit/ApiMonitor"));
const AdminAuditSecurity = lazy(() => import("./pages/admin/audit/Security"));
// VTID-AP-ADMIN: Autopilot admin
const AdminAutopilotPlanning = lazy(() => import("./pages/admin/autopilot/Planning"));
const AdminAutopilotRecommendations = lazy(() => import("./pages/admin/autopilot/Recommendations"));
const AdminAutopilotAutomations = lazy(() => import("./pages/admin/autopilot/Automations"));
const AdminAutopilotRuns = lazy(() => import("./pages/admin/autopilot/Runs"));
const AdminAutopilotGuardrails = lazy(() => import("./pages/admin/autopilot/Guardrails"));
const AdminAutopilotGrowth = lazy(() => import("./pages/admin/autopilot/Growth"));
// VTID-NAV-02: Vitana Navigator admin
const AdminNavigatorCatalog = lazy(() => import("./pages/admin/navigator/Catalog"));
const AdminNavigatorCoverage = lazy(() => import("./pages/admin/navigator/Coverage"));
const AdminNavigatorTelemetry = lazy(() => import("./pages/admin/navigator/Telemetry"));
const AdminNavigatorHistory = lazy(() => import("./pages/admin/navigator/History"));
const CommunitySupervision = lazy(() => import("./pages/admin/CommunitySupervision"));
const EventsModeration = lazy(() => import("./pages/admin/community/Events"));
const GroupsModeration = lazy(() => import("./pages/admin/community/Groups"));
const ReportedContent = lazy(() => import("./pages/admin/community/ReportedContent"));
const MediaManagement = lazy(() => import("./pages/admin/MediaManagement"));
const VideosManagement = lazy(() => import("./pages/admin/media/Videos"));
const PodcastsManagement = lazy(() => import("./pages/admin/media/Podcasts"));
const MusicManagement = lazy(() => import("./pages/admin/media/Music"));
const LiveStreamOverview = lazy(() => import("./pages/admin/LiveStreamOverview"));
const CommunityRoomsAdmin = lazy(() => import("./pages/admin/CommunityRoomsAdmin"));
const Bootstrap = lazy(() => import("./pages/admin/Bootstrap"));
const TenantManagementLegacy = lazy(() => import("./pages/admin/TenantManagement"));
const InitEvents = lazy(() => import("./pages/admin/InitEvents"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));

// Component to initialize global hooks inside provider tree
const AppHooksInitializer = () => {
  useAppointmentNotifications();
  useAudioPriority();
  useAppilix();
  useOrbVoiceWidget();
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Set Appilix push notification user identity for mobile device mapping
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      (window as any).appilix_push_notification_user_identity = user.id;
      document.cookie = `appilix_push_notification_user_identity=${user.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      // Use robust async version that waits for native bridge + retries on failure.
      // Critical for old users whose identity was never registered before this code shipped.
      ensureAppilixIdentity(user.id);
    }
  }, [user?.id]);

  // Re-register identity when app comes back to foreground (Appilix may lose mapping)
  useEffect(() => {
    if (!user?.id) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        registerAppilixIdentity(user.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  // BOOTSTRAP-NOTIF-CATEGORIES: Deep-link handler for push notifications.
  // Appilix brings the app to the foreground without navigating to the
  // notification URL, so the user lands on whatever page they left. This
  // effect polls for a very recent unread chat notification when the app
  // becomes visible and uses SPA navigation to open the conversation —
  // critically, without a page reload so the Supabase session stays hydrated.
  useEffect(() => {
    if (!user?.id) return;
    const processedIds = new Set<string>();
    let retryTimers: Array<ReturnType<typeof setTimeout>> = [];

    const clearRetries = () => {
      for (const t of retryTimers) clearTimeout(t);
      retryTimers = [];
    };

    const checkPendingNotification = async () => {
      if (document.hidden) return;

      try {
        // 5 minute window — handles slow notification taps and unlocks
        const since = new Date(Date.now() - 5 * 60_000).toISOString();
        const { data: rows, error } = await (supabase as any)
          .from('user_notifications')
          .select('id, type, data, created_at')
          .eq('user_id', user.id)
          .is('read_at', null)
          .eq('type', 'new_chat_message')
          .gt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn('[DeepLink] Supabase query error:', error);
          return;
        }

        const latest = rows?.[0];
        if (!latest) return;
        if (processedIds.has(latest.id)) return;

        const targetUrl = (latest.data as any)?.url;
        if (!targetUrl || typeof targetUrl !== 'string') {
          console.log('[DeepLink] Notification has no URL in data, skipping');
          return;
        }

        const currentPath = window.location.pathname + window.location.search;
        if (currentPath === targetUrl) return;
        // Don't hijack the user if they're already in an inbox/conversation.
        if (currentPath.startsWith('/inbox')) return;

        processedIds.add(latest.id);
        console.log('[DeepLink] Navigating to pending chat notification:', targetUrl, 'from', currentPath);
        navigate(targetUrl);
      } catch (err) {
        console.warn('[DeepLink] Pending notification check failed:', err);
      }
    };

    const triggerCheck = () => {
      if (document.hidden) return;
      // Kick off the check immediately AND retry a few times to cover races
      // where the notification INSERT hasn't propagated yet or the realtime
      // subscription hasn't received it when the handler first fires.
      clearRetries();
      checkPendingNotification();
      retryTimers.push(setTimeout(checkPendingNotification, 1500));
      retryTimers.push(setTimeout(checkPendingNotification, 4000));
      retryTimers.push(setTimeout(checkPendingNotification, 8000));
    };

    // Cover multiple re-entry points for Android WebView / Appilix:
    //   - visibilitychange: most foreground transitions
    //   - focus: WebView regains focus
    //   - pageshow: back/forward cache restores
    document.addEventListener('visibilitychange', triggerCheck);
    window.addEventListener('focus', triggerCheck);
    window.addEventListener('pageshow', triggerCheck);

    // Also run on mount (cold-start from notification tap when app was killed)
    triggerCheck();

    return () => {
      clearRetries();
      document.removeEventListener('visibilitychange', triggerCheck);
      window.removeEventListener('focus', triggerCheck);
      window.removeEventListener('pageshow', triggerCheck);
    };
  }, [user?.id, navigate]);

  // Re-register Appilix identity on auth state changes (token refresh, re-login)
  useEffect(() => {
    if (!user?.id) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        registerAppilixIdentity(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    initializePushNotifications();
  }, [user?.id, session?.access_token]);

  // ORB consent interceptor — renders only a dialog, no visible elements
  return <OrbConsentPlaceholder />;
};

// Mobile/Desktop settings router
function SettingsRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileSettings /> : <Settings />;
}

const App = () => {
  // Initialize session ID for activity logging
  useEffect(() => {
    let sessionId = sessionStorage.getItem('vitana_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('vitana_session_id', sessionId);
      console.log('[Session] Created new session:', sessionId);
    }
  }, []);

  return (
    <SoundscapeProvider>
      <RTLProvider>
        <MeetupSelectionProvider>
          <EventSelectionProvider>
            <StreamingStateProvider>
              <ProfilePreviewProvider>
                <TooltipProvider>
                    <Toaster />
                    <SonnerToaster position="top-center" richColors />
                    <PresenceDebugPanel />
                    <BrowserRouter>
                    {/* AppHooksInitializer must live INSIDE <BrowserRouter> so
                        useOrbVoiceWidget (and any other hook that uses
                        useNavigate / useLocation) has a valid Router context.
                        Moving it outside crashes the whole app at boot. */}
                    <AppHooksInitializer />
                    <MilestoneCelebration />
                    <VitanalandNavigationProvider>
                      <GreetingProviderWrapper>
                        <MobileMuteButton />
                        <SoundscapeResumeBanner />
                        <MiniAudioPlayer />
                        <TenantDetector />
                  <GlobalErrorBoundary>
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
          <Route path="/" element={<ShareEntry fallback={<Index />} />} />
          <Route path="/_intro/:tenantSlug" element={<IntroExperience />} />
          {/* /login and /register redirect to portal selector */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          
          {/* Email Confirmation Routes */}
          <Route path="/auth/confirmed" element={<EmailConfirmed />} />
          <Route path="/maxina/confirmed" element={<MaxinaConfirmed />} />
          <Route path="/alkalma/confirmed" element={<AlkalmaConfirmed />} />
          <Route path="/earthlinks/confirmed" element={<EarthlinksConfirmed />} />
          {/* /community/confirmed removed — orphaned */}

          {/* Onboarding — post-registration Vitana speech + name/handle form */}
          <Route path="/onboarding/welcome" element={
            <AuthGuard>
              <OnboardingWelcome />
            </AuthGuard>
          } />

          {/* Public Routes - No Auth Required */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
          <Route path="/maxina_support" element={<MaxinaSupport />} />
          <Route path="/redeem" element={<RedeemVoucher />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/e/:slug" element={<PublicEventLanding />} />
          <Route path="/pub/events/:id" element={<PublicEventLanding />} />
          <Route path="/pub/campaigns/:id" element={<PublicCampaignLanding />} />
          
          {/* Portal Routes */}
          <Route path="/exafy-admin" element={<ExafyAdminPortal />} />
          <Route path="/maxina" element={<MaxinaPortal />} />
          <Route path="/alkalma" element={<AlkalmaPortal />} />
          <Route path="/earthlinks" element={<EarthlinksPortal />} />
          {/* /community removed — orphaned, login handled by tenant portals */}
          
          {/* Dev Hub Routes */}
          <Route path="/dev/login" element={<DevLogin />} />
          <Route path="/dev" element={
            <DevAuthGuard>
              <DevErrorBoundary>
                <DevLayout />
              </DevErrorBoundary>
            </DevAuthGuard>
          }>
            <Route index element={<Navigate to="/dev/dashboard" replace />} />
            <Route path="dashboard" element={<DevDashboard />} />
            <Route path="dashboard/ai-feed" element={<DashboardAIFeed />} />
            <Route path="dashboard/alerts" element={<DashboardAlerts />} />
            <Route path="dashboard/health" element={<DashboardSystemHealth />} />
            <Route path="command" element={<DevCommand />} />
            <Route path="command/approvals" element={<CommandApprovals />} />
            <Route path="command/history" element={<CommandHistory />} />
            <Route path="command/compose" element={<CommandCompose />} />
            <Route path="command/tasks" element={<DevCommand />} />
            <Route path="command/autopilot-runs" element={<DevCommand />} />
            <Route path="agents" element={<DevAgents />} />
            <Route path="agents/worker" element={<AgentsWorker />} />
            <Route path="agents/validator" element={<AgentsValidator />} />
            <Route path="agents/qa-test" element={<AgentsQATest />} />
            <Route path="agents/crew-template" element={<AgentsCrewTemplate />} />
            <Route path="pipelines" element={<DevPipelines />} />
            <Route path="oasis" element={<DevOasis />} />
            <Route path="vtid" element={<DevVTID />} />
            <Route path="vtid/issue" element={<VTIDIssue />} />
            <Route path="vtid/analytics" element={<VTIDAnalytics />} />
            <Route path="vtid/search" element={<VTIDSearch />} />
            <Route path="gateway" element={<DevGateway />} />
            <Route path="gateway/requests" element={<GatewayRequests />} />
            <Route path="gateway/mobile" element={<GatewayMobileLinks />} />
            <Route path="gateway/webhooks" element={<GatewayWebhooks />} />
            <Route path="oasis" element={<DevOasis />} />
            <Route path="oasis/state" element={<OasisState />} />
            <Route path="oasis/ledger" element={<OasisLedger />} />
            <Route path="oasis/policies" element={<OasisPolicies />} />
            <Route path="pipelines" element={<DevPipelines />} />
            <Route path="pipelines/tests" element={<PipelinesTests />} />
            <Route path="pipelines/canary" element={<PipelinesCanary />} />
            <Route path="pipelines/rollbacks" element={<PipelinesRollbacks />} />
            <Route path="cicd" element={<DevCICD />} />
            <Route path="cicd/runs" element={<CICDRuns />} />
            <Route path="cicd/artifacts" element={<CICDArtifacts />} />
            <Route path="cicd/matrix" element={<CICDMatrix />} />
            <Route path="observability" element={<DevObservability />} />
            <Route path="observability/traces" element={<ObservabilityTraces />} />
            <Route path="observability/metrics" element={<ObservabilityMetrics />} />
            <Route path="observability/costs" element={<ObservabilityCosts />} />
            <Route path="settings" element={<DevSettings />} />
            <Route path="settings/auth" element={<SettingsAuth />} />
            <Route path="settings/flags" element={<SettingsFlags />} />
            <Route path="settings/tenants" element={<SettingsTenants />} />
            <Route path="docs" element={<DevDocs />} />
            <Route path="docs/catalogs" element={<DevDocs />} />
            <Route path="docs/screen-lists" element={<DevDocs />} />
            <Route path="docs/frontpages" element={<DevDocs />} />
            <Route path="docs/role-views" element={<DevDocs />} />
          </Route>
          <Route path="/home" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <Home />
              </ProtectedRoute>
            </AuthGuard>
          } />
          {/* VTID-01900: Home sub-pages removed — all /home/* redirects to /home */}
          <Route path="/home/context" element={<Navigate to="/home" replace />} />
          <Route path="/home/actions" element={<Navigate to="/home" replace />} />
          <Route path="/home/matches" element={<Navigate to="/home" replace />} />
          <Route path="/home/aifeed" element={<Navigate to="/home" replace />} />

          {/* Backwards compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/context" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/actions" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/matches" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/aifeed" element={<Navigate to="/home" replace />} />
          
          {/* Discover routes */}
          <Route path="/discover" element={
            <AuthGuard>
              <Discover />
            </AuthGuard>
          } />
          <Route path="/discover/ai-picks" element={
            <AuthGuard>
              <AIPicksPage />
            </AuthGuard>
          } />
          <Route path="/discover/supplements" element={
            <AuthGuard>
              <Supplements />
            </AuthGuard>
          } />
          <Route path="/discover/wellness-services" element={
            <AuthGuard>
              <WellnessServices />
            </AuthGuard>
          } />
          <Route path="/discover/doctors-coaches" element={
            <AuthGuard>
              <DoctorsCoaches />
            </AuthGuard>
          } />
          <Route path="/discover/provider/:id" element={
            <AuthGuard>
              <ProviderProfile />
            </AuthGuard>
          } />
          <Route path="/discover/deals-offers" element={
            <AuthGuard>
              <DealsOffers />
            </AuthGuard>
          } />
          <Route path="/discover/orders" element={
            <AuthGuard>
              <Orders />
            </AuthGuard>
          } />
          <Route path="/discover/product/:id" element={
            <AuthGuard>
              <ProductDetail />
            </AuthGuard>
          } />
          <Route path="/cart" element={
            <AuthGuard>
              <Cart />
            </AuthGuard>
          } />
          <Route path="/checkout/success" element={
            <AuthGuard>
              <CheckoutSuccess />
            </AuthGuard>
          } />
          <Route path="/tickets/success" element={<TicketPurchaseSuccess />} />
          <Route path="/packages/success" element={<PackagePurchaseSuccess />} />
          <Route path="/tickets/demo" element={<TicketDemo />} />
          <Route path="/creator/onboarded" element={
            <AuthGuard>
              <CreatorOnboarded />
            </AuthGuard>
          } />
          <Route path="/my-tickets" element={
            <AuthGuard>
              <MyTickets />
            </AuthGuard>
          } />
          
          {/* Daily Diary (mobile-optimized) */}
          <Route path="/daily-diary" element={
            <AuthGuard>
              <MobileDailyDiary />
            </AuthGuard>
          } />

          {/* Health routes */}
          <Route path="/health" element={
            <AuthGuard>
              <Health />
            </AuthGuard>
          } />
          <Route path="/health/pillars" element={
            <AuthGuard>
              <PillarsOfHealth />
            </AuthGuard>
          } />
          <Route path="/health/services-hub" element={
            <AuthGuard>
              <HealthWellnessServices />
            </AuthGuard>
          } />
          <Route path="/health/conditions" element={
            <AuthGuard>
              <ConditionsRisks />
            </AuthGuard>
          } />
          <Route path="/health/education" element={
            <AuthGuard>
              <EducationResources />
            </AuthGuard>
          } />
          <Route path="/health/my-biology" element={
            <AuthGuard>
              <MyBiology />
            </AuthGuard>
          } />
          <Route path="/health/plans" element={
            <AuthGuard>
              <Plans />
            </AuthGuard>
          } />
          {/* Redirect old routes to new structure */}
          <Route path="/health/biomarker-results" element={<Navigate to="/health/my-biology" replace />} />
          <Route path="/health/my-health-tracker" element={<Navigate to="/health" replace />} />
          
          {/* Health Tracker routes */}
          <Route path="/health-tracker" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/vitana-index" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/nutrition" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/hydration" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/sleep" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/exercise" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/mental-health" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/trends" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/devices" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/tracking" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/progress" element={<Navigate to="/health/my-health-tracker" replace />} />
          <Route path="/health-tracker/biomarker-results" element={<Navigate to="/health/my-health-tracker" replace />} />
          
          {/* Calendar routes */}

          <Route path="/comm" element={
            <AuthGuard>
              <Community />
            </AuthGuard>
          } />
          <Route path="/comm/groups" element={
            <AuthGuard>
              <Groups />
            </AuthGuard>
          } />
          <Route path="/comm/groups/:id" element={
            <AuthGuard>
              <GroupDetail />
            </AuthGuard>
          } />
          <Route path="/comm/my-groups/:id" element={
            <AuthGuard>
              <GroupDetail />
            </AuthGuard>
          } />
          {/* New consolidated Events & MeetUps route */}
          <Route path="/comm/events-meetups" element={
            <AuthGuard>
              <EventsAndMeetups />
            </AuthGuard>
          } />
          
          {/* Redirect old routes to new consolidated route */}
          <Route path="/comm/feed" element={<Navigate to="/comm/events-meetups?tab=following" replace />} />
          <Route path="/comm/events" element={<Navigate to="/comm/events-meetups?tab=today" replace />} />
          <Route path="/comm/meetups" element={<Navigate to="/comm/events-meetups?tab=today" replace />} />
          
          <Route path="/comm/live-rooms" element={
            <AuthGuard>
              <LiveRooms />
            </AuthGuard>
          } />
          <Route path="/comm/live-rooms/:roomId/view" element={
            <AuthGuard>
              <LiveRoomViewer />
            </AuthGuard>
          } />
          <Route path="/comm/media-hub" element={
            <AuthGuard>
              <MediaHub />
            </AuthGuard>
          } />
          {/* Business Hub - Standalone Section with nested routes */}
          <Route path="/business" element={
            <AuthGuard>
              <BusinessHub />
            </AuthGuard>
          }>
            <Route index element={null} />
            <Route path="services" element={null} />
            <Route path="clients" element={null} />
            <Route path="sell-earn" element={null} />
            <Route path="analytics" element={null} />
          </Route>
          
          {/* Redirect old my-business routes to new Business Hub */}
          <Route path="/comm/my-business" element={<Navigate to="/business" replace />} />
          <Route path="/comm/my-business/*" element={<Navigate to="/business" replace />} />
          <Route path="/community/my-business" element={<Navigate to="/business" replace />} />
          
          {/* Redirect old community routes */}
          <Route path="/community/groups" element={<Navigate to="/comm/groups" replace />} />
          <Route path="/community/groups/:id" element={<Navigate to="/comm/groups/:id" replace />} />
          <Route path="/community/my-groups" element={<Navigate to="/comm/groups" replace />} />
          <Route path="/comm/my-groups" element={<Navigate to="/comm/groups" replace />} />
          <Route path="/community/feed" element={<Navigate to="/comm/events-meetups?tab=following" replace />} />
          <Route path="/community/events" element={<Navigate to="/comm/events-meetups?tab=today" replace />} />
          <Route path="/community/meetups" element={<Navigate to="/comm/events-meetups?tab=today" replace />} />
          <Route path="/community/live-rooms" element={<Navigate to="/comm/live-rooms" replace />} />
          <Route path="/community/media-hub" element={<Navigate to="/comm/media-hub" replace />} />
          
          <Route path="/ai" element={
            <AuthGuard>
              <AI />
            </AuthGuard>
          } />
          <Route path="/ai/insights" element={
            <AuthGuard>
              <Insights />
            </AuthGuard>
          } />
          <Route path="/ai/recommendations" element={
            <AuthGuard>
              <AIRecommendations />
            </AuthGuard>
          } />
          <Route path="/ai/daily-summary" element={
            <AuthGuard>
              <DailySummary />
            </AuthGuard>
          } />
          <Route path="/ai/companion" element={
            <AuthGuard>
              <Companion />
            </AuthGuard>
          } />

          {/* Redirect legacy /messages routes to /inbox */}
          <Route path="/messages/*" element={<Navigate to="/inbox" replace />} />

          <Route path="/inbox" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          <Route path="/inbox/archived" element={
            <AuthGuard>
              <Archived />
            </AuthGuard>
          } />
          <Route path="/inbox/reminder" element={
            <AuthGuard>
              <Reminder />
            </AuthGuard>
          } />
          <Route path="/inbox/inspiration" element={
            <AuthGuard>
              <Inspiration />
            </AuthGuard>
          } />
          
          <Route path="/settings" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <SettingsRouter />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/settings/privacy" element={
            <AuthGuard>
              <Privacy />
            </AuthGuard>
          } />
          <Route path="/settings/notifications" element={
            <AuthGuard>
              <SettingsNotifications />
            </AuthGuard>
          } />
          <Route path="/settings/preferences" element={
            <AuthGuard>
              <Preferences />
            </AuthGuard>
          } />
          <Route path="/settings/connected-apps" element={
            <AuthGuard>
              <ConnectedApps />
            </AuthGuard>
          } />
          <Route path="/settings/tenant-role" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <TenantRole />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/settings/billing" element={
            <AuthGuard>
              <Billing />
            </AuthGuard>
          } />
          <Route path="/settings/support" element={
            <AuthGuard>
              <Support />
            </AuthGuard>
          } />
          <Route path="/settings/social" element={
            <AuthGuard>
              <SocialConnect />
            </AuthGuard>
          } />
          <Route path="/settings/autopilot" element={<Navigate to="/assistant?tab=autopilot" replace />} />
          <Route path="/settings/voice-ai" element={<Navigate to="/assistant?tab=voice" replace />} />
          
          {/* AI Assistant - New unified section */}
          <Route path="/assistant" element={
            <AuthGuard>
              <AIAssistant />
            </AuthGuard>
          } />
          
          <Route path="/profile" element={<Navigate to="/me/profile" replace />} />
          <Route path="/profile/:id" element={<LegacyProfileRedirect />} />
          <Route path="/me/profile" element={
            <AuthGuard>
              <EditProfilePage />
            </AuthGuard>
          } />
          <Route path="/search" element={
            <AuthGuard>
              <Search />
            </AuthGuard>
          } />
          <Route path="/u/:identifier" element={<PublicProfilePage />} />

          {/* Autopilot Dashboard (My Journey) */}
          <Route path="/autopilot" element={
            <AuthGuard>
              <AutopilotDashboard />
            </AuthGuard>
          } />
          {/* Invite Friends */}
          <Route path="/invite" element={
            <AuthGuard>
              <InviteFriends />
            </AuthGuard>
          } />

          {/* New module routes */}
          <Route path="/wallet" element={
            <AuthGuard>
              <Wallet />
            </AuthGuard>
          } />
          <Route path="/wallet/balance" element={
            <AuthGuard>
              <Balance />
            </AuthGuard>
          } />
          <Route path="/wallet/subscriptions" element={
            <AuthGuard>
              <Subscriptions />
            </AuthGuard>
          } />
          <Route path="/wallet/rewards" element={
            <AuthGuard>
              <Rewards />
            </AuthGuard>
          } />

          <Route path="/sharing" element={
            <AuthGuard>
              <Sharing />
            </AuthGuard>
          } />
          <Route path="/sharing/campaigns" element={
            <AuthGuard>
              <Campaigns />
            </AuthGuard>
          } />
          <Route path="/sharing/campaigns/:id" element={
            <AuthGuard>
              <CampaignDetail />
            </AuthGuard>
          } />
          <Route path="/sharing/distribution" element={
            <AuthGuard>
              <Distribution />
            </AuthGuard>
          } />
          <Route path="/sharing/data-consent" element={
            <AuthGuard>
              <DataConsent />
            </AuthGuard>
          } />

          <Route path="/memory" element={
            <AuthGuard>
              <Memory />
            </AuthGuard>
          } />
          <Route path="/memory/timeline" element={
            <AuthGuard>
              <Timeline />
            </AuthGuard>
          } />
          <Route path="/memory/diary" element={
            <AuthGuard>
              <Diary />
            </AuthGuard>
          } />
          <Route path="/memory/recall" element={
            <AuthGuard>
              <Recall />
            </AuthGuard>
          } />
          <Route path="/memory/permissions" element={
            <AuthGuard>
              <MemoryPermissions />
            </AuthGuard>
          } />
          {/* Patient Role Routes */}
          <Route path="/patient/dashboard" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/health" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <PatientHealth />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/appointments" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <PatientAppointments />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/results" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">Test Results</h1><p className="text-muted-foreground">Patient test results and lab reports</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/care-team" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">Care Team</h1><p className="text-muted-foreground">Your healthcare providers and specialists</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/goals" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">Health Goals</h1><p className="text-muted-foreground">Track and manage your health objectives</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/insurance" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">Insurance</h1><p className="text-muted-foreground">Insurance information and coverage details</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/notifications" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">Health reminders and alerts</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* Professional Role Routes */}
          <Route path="/professional/dashboard" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <ProfessionalDashboard />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/patients" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <ProfessionalPatients />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/schedule" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Schedule</h1><p className="text-muted-foreground">Manage your appointment calendar</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/tools" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Clinical Tools</h1><p className="text-muted-foreground">Medical calculators and reference tools</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/referrals" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Referrals</h1><p className="text-muted-foreground">Patient referrals and specialist networks</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/billing" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Billing</h1><p className="text-muted-foreground">Practice billing and revenue management</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/profile" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Professional Profile</h1><p className="text-muted-foreground">Manage your professional credentials and bio</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/education" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">Continuing Education</h1><p className="text-muted-foreground">CME courses and professional development</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* Staff Role Routes */}
          <Route path="/staff/dashboard" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/queue" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <StaffQueue />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/tasks" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Daily Tasks</h1><p className="text-muted-foreground">Your assigned tasks and responsibilities</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/schedule" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Schedule</h1><p className="text-muted-foreground">Work schedule and shift management</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/reports" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Daily and weekly activity reports</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/communications" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Communications</h1><p className="text-muted-foreground">Team messages and announcements</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/tools" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Staff Tools</h1><p className="text-muted-foreground">Workflow tools and resources</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/time" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">Time Tracking</h1><p className="text-muted-foreground">Clock in/out and timesheet management</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ADMIN ROUTES — Restructured (9 Sections)                  */}
          {/* ══════════════════════════════════════════════════════════ */}

          {/* Root redirect → new Overview Dashboard */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Overview section (replaces legacy Dashboard) */}
          <Route path="/admin/dashboard" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><OverviewDashboard /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/activity" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><OverviewActivity /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/alerts" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><OverviewAlerts /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/health" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><OverviewHealth /></ProtectedRoute></AuthGuard>
          } />

          {/* Legacy dashboard routes → redirect to new Overview tabs */}
          <Route path="/admin/dashboard/health" element={<Navigate to="/admin/health" replace />} />
          <Route path="/admin/dashboard/activity" element={<Navigate to="/admin/activity" replace />} />

          {/* 2. Users & Growth Section (legacy — redirects to new Members section) */}
          <Route path="/admin/users" element={<Navigate to="/admin/members/directory" replace />} />
          <Route path="/admin/users/funnel" element={<Navigate to="/admin/members/directory" replace />} />
          <Route path="/admin/users/invitations" element={<Navigate to="/admin/members/invitations" replace />} />
          <Route path="/admin/users/roles" element={<Navigate to="/admin/members/roles" replace />} />

          {/* Batch 1.B1: Members section (replaces Users & Growth) */}
          <Route path="/admin/members/directory" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MembersDirectory /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/members/invitations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MembersInvitations /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/members/roles" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MembersRolesAccess /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/members/segments" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MembersSegments /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/members/audit" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MembersAudit /></ProtectedRoute></AuthGuard>
          } />

          {/* Batch 1.B2: Assistant section */}
          <Route path="/admin/assistant/personality" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantPersonality /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/assistant/voice" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantVoice /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/assistant/tools" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantTools /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/assistant/routing" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantRouting /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/assistant/playground" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantPlayground /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/assistant/sessions" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantSessions /></ProtectedRoute></AuthGuard>
          } />

          {/* Batch 1.B2: Knowledge section */}
          <Route path="/admin/knowledge/documents" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><KnowledgeDocuments /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/knowledge/topics" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><KnowledgeTopics /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/knowledge/indexing" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><KnowledgeIndexing /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/knowledge/search-test" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><KnowledgeSearchTest /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/knowledge/governance" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><KnowledgeGovernance /></ProtectedRoute></AuthGuard>
          } />

          {/* Settings section */}
          <Route path="/admin/settings/profile" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsProfile /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/settings/branding" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsBranding /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/settings/feature-flags" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsFeatureFlags /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/settings/integrations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsIntegrations /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/settings/domains" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsDomains /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/settings/billing" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><SettingsBilling /></ProtectedRoute></AuthGuard>
          } />

          {/* Audit & Compliance section */}
          <Route path="/admin/audit/actions" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AuditActions /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/access" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AuditAccess /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/events" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AuditOasisEvents /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/policies" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AuditPolicies /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/data-rights" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AuditDataRights /></ProtectedRoute></AuthGuard>
          } />

          {/* Wave 2: Community section */}
          <Route path="/admin/community/reported" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityReported /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/meetups" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityMeetups /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/live-rooms" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityLiveRooms /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/groups" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityGroups /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/creators" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityCreators /></ProtectedRoute></AuthGuard>
          } />

          {/* Wave 2: Content section */}
          <Route path="/admin/content/videos" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ContentVideos /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/podcasts" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ContentPodcasts /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/music" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ContentMusic /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/uploads" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ContentUploads /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/analytics" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ContentAnalytics /></ProtectedRoute></AuthGuard>
          } />

          {/* Wave 2: Notifications section (new pages) */}
          <Route path="/admin/notifications/compose" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsCompose /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/templates" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsTemplates /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/sent" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsSent /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/subscriptions" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsSubscriptions /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/providers" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsProviders /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/categories" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><NotificationsCategories /></ProtectedRoute></AuthGuard>
          } />

          {/* Wave 2: Insights section */}
          <Route path="/admin/insights/growth" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsGrowth /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/engagement" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsEngagement /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/assistant-usage" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsAssistantUsage /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/autopilot-impact" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsAutopilotImpact /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/reports" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsReports /></ProtectedRoute></AuthGuard>
          } />

          {/* 3. Notifications Section (legacy) */}
          <Route path="/admin/notifications" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNotificationsCompose /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/sent" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNotificationsSentLog /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/notifications/preferences" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNotificationsPreferences /></ProtectedRoute></AuthGuard>
          } />

          {/* 4. Community Section (reuses existing pages) */}
          <Route path="/admin/community" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunitySupervision /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/meetups" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><EventsModeration /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/invitations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><GroupsModeration /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/community/moderation" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><ReportedContent /></ProtectedRoute></AuthGuard>
          } />

          {/* 5. Live Rooms Section */}
          <Route path="/admin/live" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><LiveStreamOverview /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/live/rooms" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityRoomsAdmin /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/live/sessions" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminLiveSessions /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/live/attendance" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminLiveAttendance /></ProtectedRoute></AuthGuard>
          } />

          {/* 6. Content Section (reuses existing media pages) */}
          <Route path="/admin/content" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MediaManagement /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/videos" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><VideosManagement /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/podcasts" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><PodcastsManagement /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/content/music" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><MusicManagement /></ProtectedRoute></AuthGuard>
          } />

          {/* 7. Intelligence Section */}
          <Route path="/admin/intelligence" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminIntelligenceMemory /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/intelligence/embeddings" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminIntelligenceEmbeddings /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/intelligence/signals" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminIntelligenceSignals /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/intelligence/relationships" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminIntelligenceRelationships /></ProtectedRoute></AuthGuard>
          } />

          {/* 8. System Section */}
          <Route path="/admin/system" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminSystemConfiguration /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/system/tenants" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><TenantManagementLegacy /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/system/creators" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminSystemCreators /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/system/bootstrap" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><Bootstrap /></ProtectedRoute></AuthGuard>
          } />

          {/* 9. Audit & Logs Section */}
          <Route path="/admin/audit" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAuditEvents /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/users" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAuditUserActivity /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/apis" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAuditApiMonitor /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/audit/security" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAuditSecurity /></ProtectedRoute></AuthGuard>
          } />

          {/* VTID-NAV-02: Vitana Navigator admin screens */}
          <Route path="/admin/navigator" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNavigatorCatalog /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/navigator/coverage" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNavigatorCoverage /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/navigator/telemetry" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNavigatorTelemetry /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/navigator/history" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminNavigatorHistory /></ProtectedRoute></AuthGuard>
          } />

          {/* VTID-AP-ADMIN: Autopilot admin */}
          <Route path="/admin/autopilot/planning" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotPlanning /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/autopilot/recommendations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotRecommendations /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/autopilot/automations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotAutomations /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/autopilot/runs" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotRuns /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/autopilot/guardrails" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotGuardrails /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/autopilot/growth" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAutopilotGrowth /></ProtectedRoute></AuthGuard>
          } />

          {/* Legacy admin routes — redirects for backward compatibility */}
          <Route path="/admin/init-events" element={<InitEvents />} />
          <Route path="/admin/user-management" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/user-management/staff" element={<Navigate to="/admin/users/roles" replace />} />
          <Route path="/admin/user-management/audit" element={<Navigate to="/admin/audit/users" replace />} />
          <Route path="/admin/tenant-management" element={<Navigate to="/admin/system/tenants" replace />} />
          <Route path="/admin/system-health" element={<Navigate to="/admin/dashboard/health" replace />} />
          <Route path="/admin/monitoring/reports" element={<Navigate to="/admin/audit" replace />} />
          <Route path="/admin/monitoring/notifications" element={<Navigate to="/admin/notifications" replace />} />
          <Route path="/admin/monitoring/apis" element={<Navigate to="/admin/audit/apis" replace />} />
          <Route path="/admin/ai-assistant" element={<Navigate to="/admin/intelligence" replace />} />
          <Route path="/admin/automation" element={<Navigate to="/admin/intelligence" replace />} />
          <Route path="/admin/live-stream" element={<Navigate to="/admin/live" replace />} />
          <Route path="/admin/media" element={<Navigate to="/admin/content" replace />} />
          <Route path="/admin/bootstrap" element={<Navigate to="/admin/system/bootstrap" replace />} />

          {/* Maxina Tenant Admin — wildcard catches all new ADMIN_SECTIONS paths
              (Members, Assistant, Knowledge, Navigator, Autopilot, Settings,
              new Audit tabs, wave-2 sections) and renders AdminPlaceholder
              inside AppLayout so the global frame stays intact. Must sit AFTER
              every specific /admin/* route above and BEFORE the catch-all. */}
          <Route path="/admin/*" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminPlaceholder /></ProtectedRoute></AuthGuard>
          } />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
                  </Suspense>
                  </GlobalErrorBoundary>
                  </GreetingProviderWrapper>
                </VitanalandNavigationProvider>
              </BrowserRouter>
            </TooltipProvider>
        </ProfilePreviewProvider>
      </StreamingStateProvider>
    </EventSelectionProvider>
  </MeetupSelectionProvider>
</RTLProvider>
    </SoundscapeProvider>
  );
};

// Wrapper to consume streaming state and pass to IntelligentGreetingProvider
function GreetingProviderWrapper({ children }: { children: React.ReactNode }) {
  const { glassModeActive, micActive, sessionReady } = useStreamingState();
  
  return (
    <IntelligentGreetingProvider
      glassModeActive={glassModeActive}
      micActive={micActive}
      sessionReady={sessionReady}
    >
      {children}
    </IntelligentGreetingProvider>
  );
}

export default App;