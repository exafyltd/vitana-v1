import { useEffect, useState, lazy, Suspense, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner"; // Global toast provider
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantDetector } from "@/components/TenantDetector";
import PresenceDebugPanel from "@/components/debug/PresenceDebugPanel";

import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthGuard from "@/components/AuthGuard";
import { PaywallProvider } from "@/components/paywall/PaywallProvider"; // VTID-03107
import { GuidedModeProvider } from "@/context/GuidedModeProvider"; // VTID-03279 Guided Journey
import { DevAuthGuard } from "@/components/dev/DevAuthGuard";
import { DevErrorBoundary } from "@/components/dev/DevErrorBoundary";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { isCommerceHost } from "@/lib/commerce-host"; // VTID-03555 commerce host routing
import { RTLProvider } from "@/components/RTLProvider";
import { MeetupSelectionProvider } from "@/context/MeetupSelectionContext";
import { EventSelectionProvider } from "@/context/EventSelectionContext";
import { IntelligentGreetingProvider } from "@/context/IntelligentGreetingProvider";
import { StreamingStateProvider, useStreamingState } from "@/context/StreamingStateContext";
import { ProfilePreviewProvider } from "@/hooks/useProfilePreview";
import { VitanalandNavigationProvider } from "@/context/VitanalandNavigationContext";
import { LifeCompassPopupProvider } from "@/context/LifeCompassPopupContext";
import { IdentityRedirectListener } from "@/components/identity/IdentityRedirectListener";
import { SoundscapeProvider } from "@/context/SoundscapeContext";
import { MobileMuteButton } from "@/components/audio/MobileMuteButton";
import { SoundscapeResumeBanner } from "@/components/mobile/SoundscapeResumeBanner";
import { MiniAudioPlayer } from "@/components/MiniAudioPlayer";
import { VitanaIdOnboardingCard } from "@/components/onboarding/VitanaIdOnboardingCard";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useAudioPriority } from "@/hooks/useAudioPriority";
import { useAppilix } from "@/hooks/useAppilix";
import { isAppilix, registerAppilixIdentity, ensureAppilixIdentity } from "@/lib/appilix";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { initializePushNotifications } from "@/lib/pushNotifications";
import { useOrbVoiceWidget } from "@/hooks/useOrbVoiceWidget";
import { useOrbFrontDoor } from "@/hooks/useOrbFrontDoor";
import { useRouteTracker } from "@/hooks/useRouteTracker";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { OrbConsentPlaceholder } from "@/components/audio/OrbConsentPlaceholder";
import LegacyProfileRedirect from "./components/LegacyProfileRedirect";
import MilestoneCelebration from "./components/MilestoneCelebration";
import ReminderInterruptOverlay from "./components/reminders/ReminderInterruptOverlay";
import { DelayedLoader } from "./components/ui/DelayedLoader";
import RouteTransitionOverlay from "./components/RouteTransitionOverlay";
import { usePostLoginWarmup } from "@/hooks/usePostLoginWarmup";
import { useNewsFeedKeepAlive } from "@/hooks/useNewsFeedKeepAlive";

// Route loading fallback — a full-screen clean background + delayed spinner so a
// lazy chunk that loads instantly never flashes a placeholder, and a slow one
// covers the whole viewport rather than showing a partial/intermediate screen.
const RouteFallback = () => <DelayedLoader fullscreen />;

// ─── Eager imports: shell-critical pages (auth, entry, public landing) ───
import Index from "./pages/Index";
import ShareEntry from "./pages/ShareEntry";
// Auth.tsx removed — login flows handled by tenant portals
import NotFound from "./pages/NotFound";
import { t } from '@/lib/i18n-toast';

// ─── Lazy imports: everything else, grouped by domain ───

// Auth & Legal
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/legal/TermsOfUse"));
const DeleteAccount = lazy(() => import("./pages/legal/DeleteAccount"));
const MaxinaSupport = lazy(() => import("./pages/legal/MaxinaSupport"));
const IntroExperience = lazy(() => import("./pages/IntroExperience"));
const RedeemVoucher = lazy(() => import("./pages/RedeemVoucher"));
const CreatorOnboarded = lazy(() => import("./pages/CreatorOnboarded"));
// Commerce Mesh Partner Portal + MCP OAuth consent (VTID-03546)
const PartnerConnections = lazy(() => import("./pages/PartnerConnections"));
const PartnerConnectionDetail = lazy(() => import("./pages/PartnerConnectionDetail"));
// Merchant self-service Commerce Portal — commerce.vitanaland.com (VTID-03555)
const CommercePortalLogin = lazy(() => import("./pages/portals/CommercePortalLogin"));
const CommerceLanding = lazy(() => import("./pages/CommerceLanding"));
const CommerceConnections = lazy(() => import("./pages/CommerceConnections"));
const CommerceConnectionDetail = lazy(() => import("./pages/CommerceConnectionDetail"));
const CommerceAgentConnect = lazy(() => import("./pages/CommerceAgentConnect"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Logout = lazy(() => import("./pages/Logout"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const EmailConfirmed = lazy(() => import("./pages/auth/EmailConfirmed"));
const OAuthComplete = lazy(() => import("./pages/auth/OAuthComplete"));
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
// Maxina Longevity Game — event-specific, isolated (see plan doc). Public QR
// landing (/e/game/:slug, no auth wall) is separate from the in-app entry
// (/community/event-game, authenticated) — see EventGamePublicLanding.tsx.
const EventGamePublicLanding = lazy(() => import("./pages/EventGamePublicLanding"));
const EventGamePage = lazy(() => import("./pages/community/EventGamePage"));
const Discover = lazy(() => import("./pages/Discover"));
const Reminders = lazy(() => import("./pages/Reminders"));
const Health = lazy(() => import("./pages/Health"));
const Community = lazy(() => import("./pages/Community"));
const AI = lazy(() => import("./pages/AI"));
const Messages = lazy(() => import("./pages/Messages"));
const MobileSettings = lazy(() => import("./pages/MobileSettings"));
const MobileSubscriptions = lazy(() => import("./pages/MobileSubscriptions"));
const Profile = lazy(() => import("./pages/Profile"));
const Search = lazy(() => import("./pages/Search"));
// Phase 0: /cart now redirects to /universal-cart; Cart.tsx is off the buy path.
// VTID-03236: Universal Cart page (universal_* tables via gateway) — the one cart.
const UniversalCart = lazy(() => import("./pages/UniversalCart"));
// Vitanaland Video Commerce: TikTok-style video-shop feed + single-product drawer.
const ShopFeed = lazy(() => import("./pages/ShopFeed"));
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
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
// VTID-01975: Vitana Intent Engine (P2-B) pages.
const IntentBoard = lazy(() => import("./pages/IntentBoard"));
const MyIntents = lazy(() => import("./pages/MyIntents"));
const IntentMatchDetail = lazy(() => import("./pages/IntentMatchDetail"));
const BusinessOpportunities = lazy(() => import("./pages/BusinessOpportunities"));
const BusinessListings = lazy(() => import("./pages/BusinessListings"));
const PublicEventLanding = lazy(() => import("./pages/PublicEventLanding"));
const PublicCampaignLanding = lazy(() => import("./pages/PublicCampaignLanding"));
const DownloadFlyer = lazy(() => import("./pages/DownloadFlyer"));
const MaxinaAppRedirect = lazy(() => import("./pages/MaxinaAppRedirect"));
const Apply = lazy(() => import("./pages/Apply"));
const AutopilotDashboard = lazy(() => import("./pages/AutopilotDashboard"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));
const MobileDailyDiary = lazy(() => import("./pages/MobileDailyDiary"));
const Supplements = lazy(() => import("./pages/discover/Supplements"));
const CategoryProducts = lazy(() => import("./pages/discover/CategoryProducts"));
const ProductDetail = lazy(() => import("./pages/discover/ProductDetail"));
const BusinessHub = lazy(() => import("./pages/BusinessHub"));
const AIAssistant = lazy(() => import("./pages/assistant/AIAssistant"));

// VTID-01900: Home sub-pages removed — Home is now a standalone News Feed
const NewsArticleDetail = lazy(() => import("./pages/NewsArticleDetail"));
const PostDetail = lazy(() => import("./pages/PostDetail"));

// Discover sub-pages
const WellnessServices = lazy(() => import("./pages/discover/WellnessServices"));
const DoctorsCoaches = lazy(() => import("./pages/discover/DoctorsCoaches"));
const ProviderProfile = lazy(() => import("./pages/discover/ProviderProfile"));
const DealsOffers = lazy(() => import("./pages/discover/DealsOffers"));
const Orders = lazy(() => import("./pages/discover/Orders"));
const AIPicksPage = lazy(() => import("./pages/discover/AIPicksPage"));
const DiscoverMarketplace = lazy(() => import("./pages/discover/Marketplace"));

// Health sub-pages
const PillarsOfHealth = lazy(() => import("./pages/health/PillarsOfHealth"));
const HealthWellnessServices = lazy(() => import("./pages/health/WellnessServices"));
const ConditionsRisks = lazy(() => import("./pages/health/ConditionsRisks"));
const EducationResources = lazy(() => import("./pages/health/EducationResources"));
const MyBiology = lazy(() => import("./pages/health/MyBiology"));
const Plans = lazy(() => import("./pages/health/Plans"));
const VitanaIndexDetail = lazy(() => import("./pages/health/VitanaIndexDetail"));

// Community sub-pages
const EventsAndMeetups = lazy(() => import("./pages/community/EventsAndMeetups"));
const Groups = lazy(() => import("./pages/community/Groups"));
const GroupDetail = lazy(() => import("./pages/community/GroupDetail"));
const MediaHub = lazy(() => import("./pages/community/MediaHub"));
const LiveRooms = lazy(() => import("./pages/community/LiveRooms"));
// VTID-DANCE-D4: public community members directory
const CommunityMembers = lazy(() => import("./pages/community/Members"));
// VTID-DANCE-D7: open-asks public feed
const CommunityOpenAsks = lazy(() => import("./pages/community/OpenAsks"));
const CommunityFindPartner = lazy(() => import("./pages/community/FindPartner"));
// VTID-02047: Talk to Vitana - unified feedback pipeline community capture
const TalkToVitana = lazy(() => import("./pages/community/TalkToVitana"));
const LiveRoomViewer = lazy(() => import("./pages/community/LiveRoomViewer"));

// AI sub-pages
const Insights = lazy(() => import("./pages/ai/Insights"));
const AIRecommendations = lazy(() => import("./pages/ai/AIRecommendations"));
const DailySummary = lazy(() => import("./pages/ai/DailySummary"));
const Companion = lazy(() => import("./pages/ai/Companion"));

// Messages sub-pages
const Archived = lazy(() => import("./pages/messages/Archived"));
const Inspiration = lazy(() => import("./pages/messages/Inspiration"));
const GroupChat = lazy(() => import("./pages/messages/GroupChat"));

// Settings sub-pages
const Privacy = lazy(() => import("./pages/settings/Privacy"));
const SettingsNotifications = lazy(() => import("./pages/settings/SettingsNotifications"));
const Preferences = lazy(() => import("./pages/settings/Preferences"));
const Limitations = lazy(() => import("./pages/settings/Limitations"));
const ConnectedApps = lazy(() => import("./pages/settings/ConnectedApps"));
const Billing = lazy(() => import("./pages/settings/Billing"));
const Support = lazy(() => import("./pages/settings/Support"));
const MobileSupport = lazy(() => import("./pages/MobileSupport"));
const TenantRole = lazy(() => import("./pages/settings/TenantRole"));

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
// VTID-02000: Marketplace admin (Maxina)
const AdminMarketplaceOverview = lazy(() => import("./pages/admin/marketplace/Overview"));
const AdminMarketplaceProducts = lazy(() => import("./pages/admin/marketplace/Products"));
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
const AssistantSpeeches = lazy(() => import("./pages/admin/assistant/Speeches"));
const AssistantVoice = lazy(() => import("./pages/admin/assistant/Voice"));
const AssistantTools = lazy(() => import("./pages/admin/assistant/Tools"));
const AssistantRouting = lazy(() => import("./pages/admin/assistant/Routing"));
const AssistantPlayground = lazy(() => import("./pages/admin/assistant/Playground"));
const AssistantSessions = lazy(() => import("./pages/admin/assistant/Sessions"));
// Batch 1.B2: Knowledge section pages
const KnowledgeDocuments = lazy(() => import("./pages/admin/knowledge/Documents"));
// VTID-02047: Tenant Admin Feedback page (tickets + specialists)
const AdminFeedback = lazy(() => import("./pages/admin/feedback/Feedback"));
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
const CommunityEventGameAdmin = lazy(() => import("./pages/admin/community/EventGameAdmin"));
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
// BOOTSTRAP-PRODUCT-ANALYTICS: product/behavior supervision screens
const InsightsJourneys = lazy(() => import("./pages/admin/insights/Journeys"));
const InsightsFeatures = lazy(() => import("./pages/admin/insights/Features"));
const InsightsInterests = lazy(() => import("./pages/admin/insights/Interests"));
// VTID-03567: Insights overview + raw event explorer
const InsightsOverview = lazy(() => import("./pages/admin/insights/Overview"));
const InsightsEvents = lazy(() => import("./pages/admin/insights/Events"));
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
const AdminDevicePreview = lazy(() => import("./pages/admin/DevicePreview"));
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
  useOrbFrontDoor();
  useRouteTracker();
  // Warm route chunks + React Query data for the first authenticated screens as
  // soon as auth + tenant settle — earlier than AppLayout's own prefetch.
  usePostLoginWarmup();
  // Holds the News Feed's queries active for the whole session so switching to
  // Messenger/Events and back is a cache read, not a reload. See the hook.
  useNewsFeedKeepAlive();
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

      // Appilix (esp. the Android shell) reads the push identity only at PAGE LOAD.
      // A mid-session account switch is an in-SPA navigation, not a page load, so the
      // device stays mapped to the PREVIOUS account and the newly-selected account gets
      // no push until the app is relaunched (confirmed: a manual relaunch fixes it).
      // The dynamic firebase_record_user_identity postMessage isn't honored mid-session.
      // Reproduce the relaunch automatically: reload once when the identity changes from
      // a different, previously-active one. Guarded by a persisted value so it fires
      // exactly once per switch and never loops, and only inside the Appilix shell.
      if (isAppilix()) {
        try {
          const KEY = 'appilix_active_identity';
          const prev = localStorage.getItem(KEY);
          if (prev !== user.id) {
            localStorage.setItem(KEY, user.id); // persist BEFORE reload → no loop
            if (prev) window.location.reload();  // only on a real switch, not first registration
          }
        } catch { /* localStorage unavailable — skip the reload safeguard */ }
      }
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

  // BOOTSTRAP-NOTIF-CATEGORIES: Deep-link handler for chat push notifications.
  //
  // Appilix native push already deep-links into the app on tap via
  // `open_link_url` (see gateway notification-service). This handler only
  // covers the case where the app was already RUNNING in the background and a
  // tap foregrounds the WebView without re-navigating it.
  //
  // CRITICAL: we navigate ONLY as the result of a genuine background →
  // foreground transition (a tap). A notification that arrives while the app
  // is open and visible must NEVER force-navigate the user — doing so threw
  // people out of the media hub / events / live rooms (and back to chat) on
  // every single incoming message in an active group. That is why the old
  // realtime-INSERT subscription is gone, and why the lookup is bounded to the
  // window in which the app was actually backgrounded.
  useEffect(() => {
    if (!user?.id) return;
    const processedIds = new Set<string>();
    let retryTimers: Array<ReturnType<typeof setTimeout>> = [];
    // `wasHidden` is set only by visibilitychange→hidden, so focus/pageshow
    // noise while the app is already in the foreground can't trigger a nav.
    let wasHidden = false;
    // A cold start (app launched from a tap while killed) has no prior hidden
    // moment, so seed the window to the last minute — a cold start is almost
    // always a notification tap.
    let lastHiddenAt = Date.now() - 60_000;
    let foregroundAt = Date.now();

    const clearRetries = () => {
      for (const t of retryTimers) clearTimeout(t);
      retryTimers = [];
    };

    const tryNavigateToNotification = (row: any): boolean => {
      if (!row || processedIds.has(row.id)) return false;
      const targetUrl = (row.data as any)?.url;
      if (!targetUrl || typeof targetUrl !== 'string') return false;
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath === targetUrl) {
        // Already there — Appilix's native open_link_url landed the WebView
        // on the target directly, so there's nothing to navigate. Still mark
        // this row processed: Messages.tsx immediately strips the deep-link
        // segment back to bare /inbox once it resolves the thread, which
        // would otherwise make currentPath !== targetUrl again on the very
        // next retry poll (300-3200ms later) and re-trigger navigate(),
        // remounting the same chat a second/third time for no reason.
        processedIds.add(row.id);
        return false;
      }

      processedIds.add(row.id);
      console.log('[DeepLink] Navigating to chat notification:', targetUrl, 'from', currentPath);
      navigate(targetUrl);
      return true;
    };

    const checkPendingNotification = async () => {
      if (document.hidden) return;
      try {
        // Only consider notifications that arrived while the app was
        // backgrounded — i.e. the one the user most likely tapped. The upper
        // bound (foregroundAt + grace) guarantees a message that arrives
        // *after* we foreground can never be picked up, so a retry firing a
        // few seconds later can't yank an actively-browsing user into chat.
        const since = new Date(lastHiddenAt).toISOString();
        const until = new Date(foregroundAt + 5_000).toISOString();
        const { data: rows, error } = await (supabase as any)
          .from('user_notifications')
          .select('id, type, data, created_at')
          .eq('user_id', user.id)
          .is('read_at', null)
          .eq('type', 'new_chat_message')
          .gt('created_at', since)
          .lte('created_at', until)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) {
          console.warn('[DeepLink] Supabase query error:', error);
          return;
        }
        tryNavigateToNotification(rows?.[0]);
      } catch (err) {
        console.warn('[DeepLink] Pending notification check failed:', err);
      }
    };

    const triggerCheck = () => {
      if (document.hidden) return;
      clearRetries();
      checkPendingNotification();
      // Retries cover the race where the row hasn't propagated to the read
      // replica yet. Front-loaded and more frequent than before (was just
      // 1200ms/3500ms) — on Android, where the notification tap doesn't
      // land the WebView on the target chat directly, this poll is the ONLY
      // thing that gets the user there, so its latency is fully visible as
      // "wrong screen, then a jump to chat a couple seconds later." Checking
      // every ~300-450ms instead cuts that visible delay down to whatever
      // the replica actually needs, typically well under a second. All stay
      // inside the 5s grace window above.
      retryTimers.push(setTimeout(checkPendingNotification, 300));
      retryTimers.push(setTimeout(checkPendingNotification, 700));
      retryTimers.push(setTimeout(checkPendingNotification, 1200));
      retryTimers.push(setTimeout(checkPendingNotification, 2000));
      retryTimers.push(setTimeout(checkPendingNotification, 3200));
    };

    const onForeground = () => {
      // Ignore focus/visibility events unless we were genuinely backgrounded.
      if (!wasHidden) return;
      wasHidden = false;
      foregroundAt = Date.now();
      triggerCheck();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        wasHidden = true;
        lastHiddenAt = Date.now();
        clearRetries();
      } else {
        onForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', onForeground);
    window.addEventListener('pageshow', onForeground);
    // Cold start: app launched from a notification tap while it was killed.
    triggerCheck();

    return () => {
      clearRetries();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', onForeground);
      window.removeEventListener('pageshow', onForeground);
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
  return isMobile ? <MobileSettings /> : <Navigate to="/settings/notifications" replace />;
}

// VTID-NAV-SETTINGS-TABS: the /settings/<section> routes render standalone
// desktop pages. On mobile the canonical experience is the unified
// MobileSettings screen selected by a ?mode= pill, so redirect there (same
// pattern as SettingsRouter for /settings). This also guarantees the ORB
// navigator lands on the correct mobile screen even when the session's mobile
// viewport flag isn't threaded and it falls back to the desktop route.
function MobileSettingsSection({ mode, children }: { mode: string; children: ReactNode }) {
  const isMobile = useIsMobile();
  const { search } = useLocation();
  if (!isMobile) return <>{children}</>;
  // Preserve the desktop deep-link's ?section=<slug> as the nested mobile mode
  // so the Orb's sub-pill navigation lands on the right child, not the bare
  // parent. e.g. /settings/preferences?section=appearance →
  // /settings?mode=preferences.appearance. The catalog's ?section slugs match
  // MobileSettings' child mode suffixes 1:1 (appearance/language,
  // visibility/data/security, plan/payment/invoices/creator).
  const section = new URLSearchParams(search).get('section');
  const targetMode = section ? `${mode}.${section}` : mode;
  return <Navigate to={`/settings?mode=${targetMode}`} replace />;
}

function SupportRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileSupport /> : <Support />;
}

// BOOTSTRAP-MOBILE-NAV-CONTAINMENT: /memory/diary renders the desktop Memory hub
// "Daily Diary" tab (Diary.tsx — the "Wellness Diary" tabbed view). On mobile the
// dedicated diary surface is MobileDailyDiary at /daily-diary, so redirect there
// regardless of how the user arrived (ORB, the Memory section sub-nav tab, or a
// deep link). Desktop keeps the full Memory hub.
function DiaryRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <Navigate to="/daily-diary" replace /> : <Diary />;
}

// Mobile-only storefront for plans; desktop users get the existing /wallet/subscriptions page.
function ProfileSubscriptionsRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileSubscriptions /> : <Navigate to="/wallet/subscriptions" replace />;
}

// Redirect helper that preserves the original query string (used by OAuth
// callbacks like /settings/connected-apps?connected=google → /connectors?connected=google).
function RedirectPreservingSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
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
                    <BrowserRouter basename={import.meta.env.BASE_URL}>
                    {/* AppHooksInitializer must live INSIDE <BrowserRouter> so
                        useOrbVoiceWidget (and any other hook that uses
                        useNavigate / useLocation) has a valid Router context.
                        Moving it outside crashes the whole app at boot. */}
                    <AppHooksInitializer />
                    {/* Full-screen spinner that masks redirect chains (e.g.
                        /home → /autopilot) so the wrong screen never flashes
                        while the app resolves the final destination. Lives
                        inside <BrowserRouter> but outside <Routes>. */}
                    <RouteTransitionOverlay />
                    {/* BOOTSTRAP-PRODUCT-ANALYTICS: feeds tenant/user/locale
                        context to the analytics client and emits screen_viewed
                        on every route change. Lives inside <BrowserRouter>
                        for useLocation(). */}
                    <AnalyticsTracker />
                    {/* VTID-01954: deep-link handler for identity-mutation
                        intents emitted by the brain (Identity Lock, Plan Part 1.5).
                        Lives inside <BrowserRouter> for useNavigate(). */}
                    <IdentityRedirectListener />
                    <MilestoneCelebration />
                    {/* VTID-02601: reminder fire delivery — chime + voice + banner. */}
                    <ReminderInterruptOverlay />
                    <VitanalandNavigationProvider>
                      <LifeCompassPopupProvider>
                      <GreetingProviderWrapper>
                        <MobileMuteButton />
                        <SoundscapeResumeBanner />
                        <MiniAudioPlayer />
                        <TenantDetector />
                        {/* VTID-01967: Vitana ID onboarding interstitial.
                            Renders only when profile.vitanaIdLocked === false
                            — auto-hides after the user confirms their pick. */}
                        <VitanaIdOnboardingCard />
                  {/* VTID-03107: PaywallProvider listens for `vitana:paywall-shown` window events
                      from billingApi.ts on HTTP 402 and renders a single global PaywallModal.
                      Lives inside <BrowserRouter> so the modal's useNavigate works. */}
                  <GuidedModeProvider>{/* VTID-03279: Guided vs Full app mode */}
                  <PaywallProvider>
                  <GlobalErrorBoundary>
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
          {/* commerce.vitanaland.com is host-routed onto this same build:
              its root lands on the merchant Commerce Portal (VTID-03555).
              Hostname is fixed per page load, so a render-time branch is safe. */}
          <Route path="/" element={isCommerceHost() ? <Navigate to="/commerce" replace /> : <ShareEntry fallback={<Index />} />} />
          <Route path="/_intro/:tenantSlug" element={<IntroExperience />} />
          {/* /login and /register redirect to portal selector */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          
          {/* Email Confirmation Routes */}
          <Route path="/auth/confirmed" element={<EmailConfirmed />} />
          {/* OAuth return landing — used by gateway connectors and Supabase social sign-in
              when running inside the Appilix WebView. Persists session tokens and
              attempts a deep link back into the app. */}
          <Route path="/oauth/complete" element={<OAuthComplete />} />
          {/* /auth is a catalog alias for "generic sign-in screen" — redirect to the Maxina portal */}
          <Route path="/auth" element={<Navigate to="/maxina" replace />} />
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
          {/* Maxina Longevity Game QR-code destination — deliberately a sibling
              route, not an overload of /e/:slug (see plan §4): that route
              resolves a different table via a dedicated edge function, and
              two independent tables sharing one slug param risks collisions. */}
          <Route path="/e/game/:slug" element={
            <AuthGuard allowGuest><EventGamePublicLanding /></AuthGuard>
          } />
          <Route path="/pub/campaigns/:id" element={<PublicCampaignLanding />} />
          {/* Download flyer — shared via "Invite a friend"; recipients are logged out */}
          <Route path="/download" element={<DownloadFlyer />} />
          {/* QR-code app-store redirect — printed on physical merchandise; detects
              iOS/Android and sends the visitor straight to the matching store
              listing. Distinct from /maxina (portal login) and /download
              (manual-choice invite flyer). */}
          <Route path="/maxina/app" element={<MaxinaAppRedirect />} />
          <Route path="/apply" element={<Apply />} />
          
          {/* Portal Routes */}
          <Route path="/exafy-admin" element={<ExafyAdminPortal />} />
          {/* Commerce Portal entry (VTID-03555): dark-themed, self-contained
              login page — not wrapped in AuthGuard, same pattern as the
              other portal entry points above. Hands off to /commerce. */}
          <Route path="/commerce-login" element={<CommercePortalLogin />} />
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
          <Route path="/community/event-game" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <EventGamePage />
              </ProtectedRoute>
            </AuthGuard>
          } />
          {/* VTID-01900: Home sub-pages removed — all /home/* redirects to /home */}
          <Route path="/home/context" element={<Navigate to="/home" replace />} />
          <Route path="/home/actions" element={<Navigate to="/home" replace />} />
          <Route path="/home/matches" element={<Navigate to="/home" replace />} />
          <Route path="/home/aifeed" element={<Navigate to="/home" replace />} />
          {/* Path-based (not query-string) compose deep-link — renders Home directly
              so Appilix's Android WebView can open it from a push notification tap;
              query strings silently fail there on cold notification-tap launches
              (see 20260625000000_post_notification_deeplink.sql). */}
          <Route path="/home/compose" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <Home />
              </ProtectedRoute>
            </AuthGuard>
          } />
          {/* "Try it yourself" target for the Reply & Like Comments announcement
              card — opens the comments sheet on the first real post and scrolls
              it into view (see Home.tsx's commentsDeepLinkActive), then
              normalizes back to /home. */}
          <Route path="/home/comments" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <Home />
              </ProtectedRoute>
            </AuthGuard>
          } />
          {/* Feature-announcement push notification tap target — same feed as
              /home, but deliberately NOT in useOrbFrontDoor's MAXINA_LANDING_ROUTES
              set. Appilix notification taps are full page loads (fresh React
              tree mount), which would otherwise auto-open the Orb front-door
              overlay on top of the card the notification is about. */}
          <Route path="/home/notif" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <Home />
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* News article detail — full-screen reader */}
          <Route path="/news/:id" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <NewsArticleDetail />
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* Single community post / video — deep-link target for like & comment notifications */}
          <Route path="/post/:source/:id" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <PostDetail />
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* Backwards compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/context" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/actions" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/matches" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/aifeed" element={<Navigate to="/home" replace />} />
          
          {/* Discover routes */}
          {/* Public browse surface: /discover and the Supplements / Wellness
              Services / Deals & Offers tabs render for signed-out visitors
              (allowGuest). Orders / Cart / checkout stay gated below. */}
          <Route path="/discover" element={
            <AuthGuard allowGuest>
              <Discover />
            </AuthGuard>
          } />
          <Route path="/discover/ai-picks" element={
            <AuthGuard>
              <AIPicksPage />
            </AuthGuard>
          } />
          {/* E1 — Marketplace (commercial intents) */}
          <Route path="/discover/marketplace" element={
            <AuthGuard>
              <DiscoverMarketplace />
            </AuthGuard>
          } />
          <Route path="/discover/supplements" element={
            <AuthGuard allowGuest>
              <Supplements />
            </AuthGuard>
          } />
          <Route path="/discover/category/:subcategory" element={
            <AuthGuard allowGuest>
              <CategoryProducts />
            </AuthGuard>
          } />
          <Route path="/discover/wellness-services" element={
            <AuthGuard allowGuest>
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
            <AuthGuard allowGuest>
              <DealsOffers />
            </AuthGuard>
          } />
          <Route path="/discover/orders" element={
            <AuthGuard>
              <Orders />
            </AuthGuard>
          } />
          {/* Public product detail — anonymous landings from OG share links
              must render the product page, not the portal selector.
              The Add-to-Cart button inside has its own auth gate that
              redirects to sign-in when an unauthenticated user tries to buy. */}
          <Route path="/discover/product/:id" element={<ProductDetail />} />
          {/* Phase 0: the Universal Cart is the single canonical cart.
              /cart redirects into it; the target route owns its own AuthGuard. */}
          <Route path="/cart" element={<Navigate to="/universal-cart" replace />} />
          {/* VTID-03236: Universal Cart route (gateway-backed) — the one cart. */}
          <Route path="/universal-cart" element={
            <AuthGuard>
              <UniversalCart />
            </AuthGuard>
          } />
          {/* Vitanaland Video Commerce: TikTok-style video-shop feed. */}
          <Route path="/shop" element={
            <AuthGuard>
              <ShopFeed />
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
          <Route path="/health/vitana-index" element={
            <AuthGuard>
              <VitanaIndexDetail />
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

          {/* VTID-02601 Reminders */}
          <Route path="/reminders" element={
            <AuthGuard>
              <Reminders />
            </AuthGuard>
          } />
          {/* Path-based reminder-fire push deep-link (BOOTSTRAP-NOTIF-MESSENGER-DIAG
              follow-up) — /reminders?fire=<id> silently failed to launch in
              Appilix's Android in-app browser because it's a query string.
              Reminders.tsx / ReminderInterruptOverlay.tsx accept both forms. */}
          <Route path="/reminders/fire/:fireId" element={
            <AuthGuard>
              <Reminders />
            </AuthGuard>
          } />
          <Route path="/inbox/reminder" element={<Navigate to="/reminders" replace />} />
          <Route path="/messages/reminder" element={<Navigate to="/reminders" replace />} />

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
          {/* VTID-DANCE-D4: public community members directory */}
          <Route path="/comm/members" element={
            <AuthGuard>
              <CommunityMembers />
            </AuthGuard>
          } />
          <Route path="/community/members" element={<Navigate to="/comm/members" replace />} />
          {/* VTID-DANCE-D7: open-asks feed */}
          <Route path="/comm/open-asks" element={
            <AuthGuard>
              <CommunityOpenAsks />
            </AuthGuard>
          } />
          <Route path="/community/open-asks" element={<Navigate to="/comm/open-asks" replace />} />
          {/* E6: Find a Partner — unified dance + fitness destination */}
          <Route path="/comm/find-partner" element={
            <AuthGuard>
              <CommunityFindPartner />
            </AuthGuard>
          } />
          {/* VTID-02047: Talk to Vitana - unified feedback pipeline */}
          <Route path="/comm/talk-to-vitana" element={
            <AuthGuard>
              <TalkToVitana />
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
          {/* BOOTSTRAP-NOTIF-MESSENGER-DIAG (follow-up):
              Path-based chat deep-links. Query-string URLs like
              /inbox?recipient=<uuid>&context=global fail to launch in
              Appilix's Android in-app browser (silent failure pre-network,
              no [NotifDiag] beacon ever fires), so the gateway now sends
              /inbox/u/<userId> instead. /u/ and /t/ prefixes avoid
              collisions with existing static subroutes (archived,
              inspiration, reminder). Messages.tsx accepts both forms. */}
          <Route path="/inbox/u/:recipientId" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          <Route path="/inbox/t/:threadId" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          {/* Reaction notification deep-links: same path-based forms as above
              plus a trailing /msg/:messageId segment so the conversation
              scrolls to and highlights the reacted-to message. Kept as a
              path segment (not a query string) for the same Appilix reason
              documented above. */}
          <Route path="/inbox/u/:recipientId/msg/:messageId" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          <Route path="/inbox/t/:threadId/msg/:messageId" element={
            <AuthGuard>
              <Messages />
            </AuthGuard>
          } />
          {/* VTID-03089: group chat — deep-link from push notifications
              (gateway notification url is /inbox/g/<groupId>). Standalone
              page; main /inbox list integration is a separate follow-up. */}
          <Route path="/inbox/g/:groupId" element={
            <AuthGuard>
              <GroupChat />
            </AuthGuard>
          } />
          <Route path="/inbox/g/:groupId/msg/:messageId" element={
            <AuthGuard>
              <GroupChat />
            </AuthGuard>
          } />
          <Route path="/inbox/archived" element={
            <AuthGuard>
              <Archived />
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
              <MobileSettingsSection mode="privacy"><Privacy /></MobileSettingsSection>
            </AuthGuard>
          } />
          <Route path="/settings/notifications" element={
            <AuthGuard>
              <MobileSettingsSection mode="notifications"><SettingsNotifications /></MobileSettingsSection>
            </AuthGuard>
          } />
          <Route path="/settings/preferences" element={
            <AuthGuard>
              <MobileSettingsSection mode="preferences"><Preferences /></MobileSettingsSection>
            </AuthGuard>
          } />
          <Route path="/settings/limitations" element={
            <AuthGuard>
              <Limitations />
            </AuthGuard>
          } />
          <Route path="/connectors" element={
            <AuthGuard>
              <ConnectedApps />
            </AuthGuard>
          } />
          <Route path="/support" element={
            <AuthGuard>
              <SupportRouter />
            </AuthGuard>
          } />
          <Route path="/settings/connected-apps" element={<RedirectPreservingSearch to="/connectors" />} />
          <Route path="/settings/social" element={<RedirectPreservingSearch to="/connectors" />} />
          <Route path="/settings/support" element={<Navigate to="/support" replace />} />
          <Route path="/settings/tenant-role" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="community">
                <TenantRole />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/settings/billing" element={
            <AuthGuard>
              <MobileSettingsSection mode="billing"><Billing /></MobileSettingsSection>
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
          <Route path="/profile/subscriptions" element={
            <AuthGuard>
              <ProfileSubscriptionsRouter />
            </AuthGuard>
          } />
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
          {/* Full "People who match you" list — See-all target for MatchesPreview */}
          <Route path="/me/matches" element={
            <AuthGuard>
              <MatchesPage />
            </AuthGuard>
          } />
          {/* E5 — Privacy & Visibility settings */}
          <Route path="/profile/me/privacy" element={
            <AuthGuard>
              <PrivacySettings />
            </AuthGuard>
          } />

          {/* VTID-01975: Vitana Intent Engine — community + business hub pages. */}
          <Route path="/intents/board" element={
            <AuthGuard>
              <IntentBoard />
            </AuthGuard>
          } />
          {/* E1 — /intents/mine kept as a deprecated alias for now; new
              destination is the MyPostsSection on the user's own
              PublicProfilePage. Will fully retire once cross-user
              section reads land for non-owners. */}
          <Route path="/intents/mine" element={
            <AuthGuard>
              <MyIntents />
            </AuthGuard>
          } />
          <Route path="/intents/match/:id" element={
            <AuthGuard>
              <IntentMatchDetail />
            </AuthGuard>
          } />
          <Route path="/business/opportunities" element={
            <AuthGuard>
              <BusinessOpportunities />
            </AuthGuard>
          } />
          <Route path="/business/listings" element={
            <AuthGuard>
              <BusinessListings />
            </AuthGuard>
          } />

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
              <DiaryRouter />
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
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.testResults')}</h1><p className="text-muted-foreground">{t('screens.common.patientTestResultsLabReports')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/care-team" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.careTeam')}</h1><p className="text-muted-foreground">{t('screens.common.yourHealthcareProvidersSpecialists')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/goals" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.healthGoals')}</h1><p className="text-muted-foreground">{t('screens.common.trackManageYourHealthObjectives')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/insurance" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.insurance')}</h1><p className="text-muted-foreground">{t('screens.common.insuranceInformationCoverageDetails')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/patient/notifications" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="patient">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.notifications')}</h1><p className="text-muted-foreground">{t('screens.common.healthRemindersAlerts')}</p></div>
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
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.schedule')}</h1><p className="text-muted-foreground">{t('screens.common.manageYourAppointmentCalendar')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/tools" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.clinicalTools')}</h1><p className="text-muted-foreground">{t('screens.common.medicalCalculatorsReferenceTools')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/referrals" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.referrals')}</h1><p className="text-muted-foreground">{t('screens.common.patientReferralsSpecialistNetworks')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/billing" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.billing')}</h1><p className="text-muted-foreground">{t('screens.common.practiceBillingRevenueManagement')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/profile" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.professionalProfile')}</h1><p className="text-muted-foreground">{t('screens.common.manageYourProfessionalCredentialsBio')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/professional/education" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="professional">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.continuingEducation')}</h1><p className="text-muted-foreground">{t('screens.common.cmeCoursesProfessionalDevelopment')}</p></div>
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
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.dailyTasks')}</h1><p className="text-muted-foreground">{t('screens.common.yourAssignedTasksResponsibilities')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/schedule" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.schedule')}</h1><p className="text-muted-foreground">{t('screens.common.workScheduleShiftManagement')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/reports" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.reports')}</h1><p className="text-muted-foreground">{t('screens.common.dailyWeeklyActivityReports')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/communications" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.communications')}</h1><p className="text-muted-foreground">{t('screens.common.teamMessagesAnnouncements')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/tools" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.staffTools')}</h1><p className="text-muted-foreground">{t('screens.common.workflowToolsResources')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/staff/time" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <div className="p-6"><h1 className="text-3xl font-bold">{t('screens.common.timeTracking')}</h1><p className="text-muted-foreground">{t('screens.common.clockInoutTimesheetManagement')}</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ADMIN ROUTES — Restructured (9 Sections)                  */}
          {/* ══════════════════════════════════════════════════════════ */}

          {/* Commerce Mesh Partner Portal (VTID-03546) — admin back office
              over the gateway's /api/v1/vcaop/portal surface. */}
          <Route path="/partner/connections" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><PartnerConnections /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/partner/connections/:id" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><PartnerConnectionDetail /></ProtectedRoute></AuthGuard>
          } />
          {/* Merchant self-service Commerce Portal (VTID-03555) — owner-scoped
              /api/v1/vcaop/portal/my surface; any signed-in user manages the
              businesses THEY created (no admin role). Path-based here so PR
              previews verify it; commerce.vitanaland.com host-routes onto it. */}
          <Route path="/commerce" element={<AuthGuard><CommerceLanding /></AuthGuard>} />
          <Route path="/commerce/connections" element={<AuthGuard><CommerceConnections /></AuthGuard>} />
          <Route path="/commerce/connections/:id" element={<AuthGuard><CommerceConnectionDetail /></AuthGuard>} />
          <Route path="/commerce/agent-connect" element={<AuthGuard><CommerceAgentConnect /></AuthGuard>} />
          {/* MCP OAuth consent (BLK-007): the embedded AS 302s here; any
              signed-in user consents for themselves. */}
          <Route path="/oauth/consent" element={
            <AuthGuard><OAuthConsent /></AuthGuard>
          } />

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

          {/* VTID-02000: Marketplace admin */}
          <Route path="/admin/marketplace" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminMarketplaceOverview /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/marketplace/products" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminMarketplaceProducts /></ProtectedRoute></AuthGuard>
          } />

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
          <Route path="/admin/assistant/speeches" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AssistantSpeeches /></ProtectedRoute></AuthGuard>
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

          {/* VTID-02047: Feedback section */}
          <Route path="/admin/feedback" element={<Navigate to="/admin/feedback/tickets" replace />} />
          <Route path="/admin/feedback/:tab" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminFeedback /></ProtectedRoute></AuthGuard>
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
          <Route path="/admin/insights/overview" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsOverview /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/events" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsEvents /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/growth" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsGrowth /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/engagement" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsEngagement /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/assistant-usage" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsAssistantUsage /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/journeys" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsJourneys /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/features" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsFeatures /></ProtectedRoute></AuthGuard>
          } />
          <Route path="/admin/insights/interests" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><InsightsInterests /></ProtectedRoute></AuthGuard>
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
          <Route path="/admin/community/event-game" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><CommunityEventGameAdmin /></ProtectedRoute></AuthGuard>
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

          {/* Device Preview: mobile UI "simulator" for staging (UI-only, not the Appilix shell) */}
          <Route path="/admin/device-preview" element={
            <AuthGuard><ProtectedRoute requiredRole="admin"><AdminDevicePreview /></ProtectedRoute></AuthGuard>
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
                  </PaywallProvider>{/* VTID-03107 */}
                  </GuidedModeProvider>{/* VTID-03279 */}
                  </GreetingProviderWrapper>
                  </LifeCompassPopupProvider>
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