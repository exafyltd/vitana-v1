import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner"; // Global toast provider
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantDetector } from "@/components/TenantDetector";
import PresenceDebugPanel from "@/components/debug/PresenceDebugPanel";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthGuard from "@/components/AuthGuard";
import { DevAuthGuard } from "@/components/dev/DevAuthGuard";
import { DevErrorBoundary } from "@/components/dev/DevErrorBoundary";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { RTLProvider } from "@/components/RTLProvider";
import { MeetupSelectionProvider } from "@/context/MeetupSelectionContext";
import { EventSelectionProvider } from "@/context/EventSelectionContext";
import { IntelligentGreetingProvider } from "@/context/IntelligentGreetingProvider";
import { StreamingStateProvider, useStreamingState } from "@/context/StreamingStateContext";
import { ProfilePreviewProvider } from "@/hooks/useProfilePreview";
import { VitanaAudioOverlay } from "@/components/audio/VitanaAudioOverlay";
import { VitanalandNavigationProvider } from "@/context/VitanalandNavigationContext";
import { PersistentGuideOrb } from "@/components/vitanaland/PersistentGuideOrb";
import { SoundscapeProvider } from "@/context/SoundscapeContext";
import { MobileMuteButton } from "@/components/audio/MobileMuteButton";
import { SoundscapeResumeBanner } from "@/components/mobile/SoundscapeResumeBanner";
import Index from "./pages/Index";
import ShareEntry from "./pages/ShareEntry";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfUse from "./pages/legal/TermsOfUse";
import DeleteAccount from "./pages/legal/DeleteAccount";
import MaxinaSupport from "./pages/legal/MaxinaSupport";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";
import IntroExperience from "./pages/IntroExperience";
import RedeemVoucher from "./pages/RedeemVoucher";
import CreatorOnboarded from "./pages/CreatorOnboarded";
import Logout from "./pages/Logout";
import ResetPassword from "./pages/auth/ResetPassword";

// Portal pages
import ExafyAdminPortal from "./pages/portals/ExafyAdminPortal";
import MaxinaPortal from "./pages/portals/MaxinaPortal";
import AlkalmaPortal from "./pages/portals/AlkalmaPortal";
import EarthlinksPortal from "./pages/portals/EarthlinksPortal";
import CommunityPortal from "./pages/portals/CommunityPortal";

// Dev Hub pages
import DevLogin from "./pages/dev/DevLogin";
import DevDashboard from "./pages/dev/DevDashboard";
import DevSettings from "./pages/dev/DevSettings";
import DevCommand from "./pages/dev/DevCommand";
import DevAgents from "./pages/dev/DevAgents";
import DevPipelines from "./pages/dev/DevPipelines";
import DevOasis from "./pages/dev/DevOasis";
import DevVTID from "./pages/dev/DevVTID";
import DevGateway from "./pages/dev/DevGateway";
import DevCICD from "./pages/dev/DevCICD";
import DevObservability from "./pages/dev/DevObservability";
import DevDocs from "./pages/dev/DevDocs";
import DevLayout from "./layouts/DevLayout";

// Dev Hub Dashboard sub-pages
import DashboardAIFeed from "./pages/dev/dashboard/AIFeed";
import DashboardAlerts from "./pages/dev/dashboard/Alerts";
import DashboardSystemHealth from "./pages/dev/dashboard/SystemHealth";

// Dev Hub Command sub-pages
import CommandApprovals from "./pages/dev/command/Approvals";
import CommandHistory from "./pages/dev/command/History";
import CommandCompose from "./pages/dev/command/Compose";

// Dev Hub Agents sub-pages
import AgentsWorker from "./pages/dev/agents/Worker";
import AgentsValidator from "./pages/dev/agents/Validator";
import AgentsQATest from "./pages/dev/agents/QATest";
import AgentsCrewTemplate from "./pages/dev/agents/CrewTemplate";

// Dev Hub VTID sub-pages
import VTIDIssue from "./pages/dev/vtid/Issue";
import VTIDAnalytics from "./pages/dev/vtid/Analytics";
import VTIDSearch from "./pages/dev/vtid/Search";

// Dev Hub Gateway sub-pages
import GatewayRequests from "./pages/dev/gateway/Requests";
import GatewayMobileLinks from "./pages/dev/gateway/MobileLinks";
import GatewayWebhooks from "./pages/dev/gateway/Webhooks";

// Dev Hub OASIS sub-pages
import OasisState from "./pages/dev/oasis/State";
import OasisLedger from "./pages/dev/oasis/Ledger";
import OasisPolicies from "./pages/dev/oasis/Policies";

// Dev Hub Pipelines sub-pages
import PipelinesTests from "./pages/dev/pipelines/Tests";
import PipelinesCanary from "./pages/dev/pipelines/Canary";
import PipelinesRollbacks from "./pages/dev/pipelines/Rollbacks";

// Dev Hub CI/CD sub-pages
import CICDRuns from "./pages/dev/cicd/Runs";
import CICDArtifacts from "./pages/dev/cicd/Artifacts";
import CICDMatrix from "./pages/dev/cicd/Matrix";

// Dev Hub Observability sub-pages
import ObservabilityTraces from "./pages/dev/observability/Traces";
import ObservabilityMetrics from "./pages/dev/observability/Metrics";
import ObservabilityCosts from "./pages/dev/observability/Costs";

// Dev Hub Settings sub-pages
import SettingsAuth from "./pages/dev/settings/Auth";
import SettingsFlags from "./pages/dev/settings/Flags";
import SettingsTenants from "./pages/dev/settings/Tenants";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Supplements from "./pages/discover/Supplements";
import ProductDetail from "./pages/discover/ProductDetail";
import Health from "./pages/Health";
import HealthTracker from "./pages/HealthTracker";
import Calendar from "./pages/Calendar";
import Cart from "./pages/Cart";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import TicketPurchaseSuccess from "./pages/TicketPurchaseSuccess";
import PackagePurchaseSuccess from "./pages/PackagePurchaseSuccess";
import MyTickets from "./pages/MyTickets";
import TicketDemo from "./pages/TicketDemo";
import Community from "./pages/Community";
import AI from "./pages/AI";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import MobileSettings from "./pages/MobileSettings";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";

// Email confirmation pages
import EmailConfirmed from "./pages/auth/EmailConfirmed";
import MaxinaConfirmed from "./pages/portals/MaxinaConfirmed";
import AlkalmaConfirmed from "./pages/portals/AlkalmaConfirmed";
import EarthlinksConfirmed from "./pages/portals/EarthlinksConfirmed";
import CommunityConfirmed from "./pages/portals/CommunityConfirmed";
import PublicProfilePage from "./pages/PublicProfilePage";
import PublicEventLanding from "./pages/PublicEventLanding";
import PublicCampaignLanding from "./pages/PublicCampaignLanding";
import EditProfilePage from "./pages/EditProfilePage";
import Wallet from "./pages/Wallet";
import Sharing from "./pages/Sharing";
import Memory from "./pages/Memory";
import LegacyProfileRedirect from "./components/LegacyProfileRedirect";
// Role-specific dashboards
import PatientDashboard from "./pages/patient/Dashboard";
import PatientHealth from "./pages/patient/Health";
import PatientAppointments from "./pages/patient/Appointments";
import ProfessionalDashboard from "./pages/professional/Dashboard";
import ProfessionalPatients from "./pages/professional/Patients";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffQueue from "./pages/staff/Queue";
import AdminDashboard from "./pages/admin/Dashboard";
import AIAssistant from "./pages/assistant/AIAssistant";

// Home sub-pages
import Context from "./pages/home/Context";
import Actions from "./pages/home/Actions";
import Matches from "./pages/home/Matches";
import AIFeed from "./pages/home/AIFeed";

// Discover sub-pages
import WellnessServices from "./pages/discover/WellnessServices";
import DoctorsCoaches from "./pages/discover/DoctorsCoaches";
import ProviderProfile from "./pages/discover/ProviderProfile";
import DealsOffers from "./pages/discover/DealsOffers";
import Orders from "./pages/discover/Orders";
import AIPicksPage from "./pages/discover/AIPicksPage";

// Health sub-pages
import PillarsOfHealth from "./pages/health/PillarsOfHealth";
import HealthWellnessServices from "./pages/health/WellnessServices";
import ConditionsRisks from "./pages/health/ConditionsRisks";
import EducationResources from "./pages/health/EducationResources";
import BiomarkerResults from "./pages/health/BiomarkerResults";
import MyBiology from "./pages/health/MyBiology";
import Plans from "./pages/health/Plans";

// Health Tracker sub-pages - REMOVED (redirected to /health/my-health-tracker)

// Calendar sub-pages - REMOVED (using universal popup system)

// Community sub-pages
import EventsAndMeetups from "./pages/community/EventsAndMeetups";
import MyBusiness from "./pages/community/MyBusinessRenamed";
import BusinessHub from "./pages/BusinessHub";
import MediaHub from "./pages/community/MediaHub";
import LiveRooms from "./pages/community/LiveRooms";
import AIInsights from "./pages/community/AIInsights";
import GroupDetail from "./pages/community/GroupDetail";
import Groups from "./pages/community/Groups";
import LiveRoomViewer from "./pages/community/LiveRoomViewer";

// AI sub-pages
import Insights from "./pages/ai/Insights";
import AIRecommendations from "./pages/ai/AIRecommendations";
import DailySummary from "./pages/ai/DailySummary";
import Companion from "./pages/ai/Companion";

// Messages sub-pages
import Archived from "./pages/messages/Archived";
import Reminder from "./pages/messages/Reminder";
import Inspiration from "./pages/messages/Inspiration";

// Settings sub-pages
import Privacy from "./pages/settings/Privacy";
import SettingsNotifications from "./pages/settings/SettingsNotifications";
import Preferences from "./pages/settings/Preferences";
import ConnectedApps from "./pages/settings/ConnectedApps";
import Billing from "./pages/settings/Billing";
import Support from "./pages/settings/Support";
import TenantRole from "./pages/settings/TenantRole";
import AutopilotSettings from "./pages/settings/AutopilotSettings";
import VoiceAISettings from "./pages/settings/VoiceAISettings";
import SocialConnect from "./pages/settings/SocialConnect";
import AutopilotDashboard from "./pages/AutopilotDashboard";
import InviteFriends from "./pages/InviteFriends";
import MilestoneCelebration from "./components/MilestoneCelebration";

// Wallet sub-pages
import Balance from "./pages/wallet/Balance";
import Subscriptions from "./pages/wallet/Subscriptions";
import Rewards from "./pages/wallet/Rewards";

// Sharing sub-pages
import Distribution from "./pages/sharing/Distribution";
import DataConsent from "./pages/sharing/DataConsent";
import Campaigns from "./pages/sharing/Campaigns";
import CampaignDetail from "./pages/sharing/CampaignDetail";

// Memory sub-pages
import Timeline from "./pages/memory/Timeline";
import Recall from "./pages/memory/Recall";
import MemoryPermissions from "./pages/memory/Permissions";
import Diary from "./pages/memory/Diary";
import MobileDailyDiary from "./pages/MobileDailyDiary";

// Admin sub-pages — Restructured (Phase 1: Dashboard + Users & Growth)
import AdminDashboardHealth from "./pages/admin/dashboard/SystemHealth";
import AdminDashboardActivity from "./pages/admin/dashboard/ActivityFeed";
import AdminAllUsers from "./pages/admin/users/AllUsers";
import AdminSignupFunnel from "./pages/admin/users/SignupFunnel";
import AdminInvitations from "./pages/admin/users/Invitations";
import AdminRolesAccess from "./pages/admin/users/RolesAccess";
// Admin sub-pages — Notifications (Phase 2)
import AdminNotificationsCompose from "./pages/admin/notifications/Compose";
import AdminNotificationsSentLog from "./pages/admin/notifications/SentLog";
import AdminNotificationsPreferences from "./pages/admin/notifications/Preferences";
// Admin sub-pages — Live Rooms (Phase 3)
import AdminLiveSessions from "./pages/admin/live/Sessions";
import AdminLiveAttendance from "./pages/admin/live/Attendance";
// Admin sub-pages — Intelligence (Phase 3)
import AdminIntelligenceMemory from "./pages/admin/intelligence/Memory";
import AdminIntelligenceEmbeddings from "./pages/admin/intelligence/Embeddings";
import AdminIntelligenceSignals from "./pages/admin/intelligence/Signals";
import AdminIntelligenceRelationships from "./pages/admin/intelligence/Relationships";
// Admin sub-pages — System (Phase 3)
import AdminSystemConfiguration from "./pages/admin/system/Configuration";
import AdminSystemCreators from "./pages/admin/system/Creators";
// Admin sub-pages — Audit (Phase 3)
import AdminAuditEvents from "./pages/admin/audit/Events";
import AdminAuditUserActivity from "./pages/admin/audit/UserActivity";
import AdminAuditApiMonitor from "./pages/admin/audit/ApiMonitor";
import AdminAuditSecurity from "./pages/admin/audit/Security";
// Admin sub-pages — Legacy (kept for existing pages reused in new structure)
import CommunitySupervision from "./pages/admin/CommunitySupervision";
import EventsModeration from "./pages/admin/community/Events";
import GroupsModeration from "./pages/admin/community/Groups";
import ReportedContent from "./pages/admin/community/ReportedContent";
import MediaManagement from "./pages/admin/MediaManagement";
import VideosManagement from "./pages/admin/media/Videos";
import PodcastsManagement from "./pages/admin/media/Podcasts";
import MusicManagement from "./pages/admin/media/Music";
import LiveStreamOverview from "./pages/admin/LiveStreamOverview";
import CommunityRoomsAdmin from "./pages/admin/CommunityRoomsAdmin";
import Bootstrap from "./pages/admin/Bootstrap";
import TenantManagementLegacy from "./pages/admin/TenantManagement";
import InitEvents from "./pages/admin/InitEvents";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useAudioPriority } from "@/hooks/useAudioPriority";
import { useAppilix } from "@/hooks/useAppilix";
import { registerAppilixIdentity } from "@/lib/appilix";
import { useAuth } from "@/context/AuthProvider";
import { initializePushNotifications } from "@/lib/pushNotifications";

// Component to initialize global hooks inside provider tree
const AppHooksInitializer = () => {
  useAppointmentNotifications();
  useAudioPriority();
  useAppilix();
  const { user, session } = useAuth();

  // Set Appilix push notification user identity for mobile device mapping
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      (window as any).appilix_push_notification_user_identity = user.id;
      document.cookie = `appilix_push_notification_user_identity=${user.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      // Register identity with native Appilix bridge so push notifications can find this device
      registerAppilixIdentity(user.id);
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

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    initializePushNotifications();
  }, [user?.id, session?.access_token]);

  return null;
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
                    <MilestoneCelebration />
                    <PresenceDebugPanel />
                    <AppHooksInitializer />
                    <BrowserRouter>
                    <VitanalandNavigationProvider>
                      <GreetingProviderWrapper>
                        <PersistentGuideOrb />
                        <VitanaAudioOverlay />
                        <MobileMuteButton />
                        <SoundscapeResumeBanner />
                        <TenantDetector />
                  <Routes>
          <Route path="/" element={<ShareEntry fallback={<Index />} />} />
          <Route path="/_intro/:tenantSlug" element={<IntroExperience />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* Email Confirmation Routes */}
          <Route path="/auth/confirmed" element={<EmailConfirmed />} />
          <Route path="/maxina/confirmed" element={<MaxinaConfirmed />} />
          <Route path="/alkalma/confirmed" element={<AlkalmaConfirmed />} />
          <Route path="/earthlinks/confirmed" element={<EarthlinksConfirmed />} />
          <Route path="/community/confirmed" element={<CommunityConfirmed />} />
          
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
          <Route path="/community" element={<CommunityPortal />} />
          
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
          <Route path="/home/context" element={
            <AuthGuard>
              <Context />
            </AuthGuard>
          } />
          <Route path="/home/actions" element={
            <AuthGuard>
              <Actions />
            </AuthGuard>
          } />
          <Route path="/home/matches" element={
            <AuthGuard>
              <Matches />
            </AuthGuard>
          } />
          <Route path="/home/aifeed" element={
            <AuthGuard>
              <AIFeed />
            </AuthGuard>
          } />
          
          {/* Backwards compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/context" element={<Navigate to="/home/context" replace />} />
          <Route path="/dashboard/actions" element={<Navigate to="/home/actions" replace />} />
          <Route path="/dashboard/matches" element={<Navigate to="/home/matches" replace />} />
          <Route path="/dashboard/aifeed" element={<Navigate to="/home/aifeed" replace />} />
          
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

          {/* Root redirect */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* 1. Dashboard Section */}
          <Route path="/admin/dashboard" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/dashboard/health" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminDashboardHealth /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/dashboard/activity" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminDashboardActivity /></ProtectedRoute></AuthGuard>
          } />

          {/* 2. Users & Growth Section */}
          <Route path="/admin/users" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminAllUsers /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/users/funnel" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminSignupFunnel /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/users/invitations" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminInvitations /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/users/roles" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminRolesAccess /></ProtectedRoute></AuthGuard>
          } />

          {/* 3. Notifications Section */}
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
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
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