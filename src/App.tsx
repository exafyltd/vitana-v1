import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RTLProvider } from "@/components/RTLProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Health from "./pages/Health";
import HealthTracker from "./pages/HealthTracker";
import Calendar from "./pages/Calendar";
import Community from "./pages/Community";
import AI from "./pages/AI";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";
import PublicProfilePage from "./pages/PublicProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import Wallet from "./pages/Wallet";
import Sharing from "./pages/Sharing";
import Memory from "./pages/Memory";
import Admin from "./pages/Admin";
import LegacyProfileRedirect from "./components/LegacyProfileRedirect";

// Home sub-pages
import Context from "./pages/home/Context";
import Actions from "./pages/home/Actions";
import Matches from "./pages/home/Matches";
import AIFeed from "./pages/home/AIFeed";

// Discover sub-pages
import WellnessServices from "./pages/discover/WellnessServices";
import DoctorsCoaches from "./pages/discover/DoctorsCoaches";
import DealsOffers from "./pages/discover/DealsOffers";
import Orders from "./pages/discover/Orders";

// Health sub-pages
import PillarsOfHealth from "./pages/health/PillarsOfHealth";
import HealthWellnessServices from "./pages/health/WellnessServices";
import ConditionsRisks from "./pages/health/ConditionsRisks";
import EducationResources from "./pages/health/EducationResources";
import BiomarkerResults from "./pages/health/BiomarkerResults";
import MyHealthTracker from "./pages/health/MyHealthTracker";

// Health Tracker sub-pages - REMOVED (redirected to /health/my-health-tracker)

// Calendar sub-pages
import Month from "./pages/calendar/Month";
import Week from "./pages/calendar/Week";
import Day from "./pages/calendar/Day";
import Appointments from "./pages/calendar/Appointments";
import CalendarEvents from "./pages/calendar/Events";
import Reminders from "./pages/calendar/Reminders";
import Motivation from "./pages/calendar/Motivation";
import CalendarProgress from "./pages/calendar/Progress";
import CalendarRecommendations from "./pages/calendar/Recommendations";

// Community sub-pages
import MyGroups from "./pages/community/MyGroups";
import Feed from "./pages/community/Feed";
import CommunityEvents from "./pages/community/Events";
import Meetups from "./pages/community/Meetups2";
import MyBusiness from "./pages/community/MyBusinessRenamed";
import MediaHub from "./pages/community/MediaHub";
import LiveRooms from "./pages/community/LiveRooms";
import AIInsights from "./pages/community/AIInsights";
import GroupDetail from "./pages/community/GroupDetail";
import LiveRoomViewer from "./pages/community/LiveRoomViewer";

// AI sub-pages
import Insights from "./pages/ai/Insights";
import AIRecommendations from "./pages/ai/AIRecommendations";
import DailySummary from "./pages/ai/DailySummary";
import Companion from "./pages/ai/Companion";

// Messages sub-pages
import Direct from "./pages/messages/Direct";
import Group from "./pages/messages/Group";
import MessagesNotifications from "./pages/messages/Notifications";
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

// Wallet sub-pages
import Balance from "./pages/wallet/Balance";
import Subscriptions from "./pages/wallet/Subscriptions";
import Rewards from "./pages/wallet/Rewards";

// Sharing sub-pages
import Consent from "./pages/sharing/Consent";
import Packages from "./pages/sharing/Packages";
import SmartPackage from "./pages/sharing/SmartPackage";
import Marketplace from "./pages/sharing/Marketplace";
import Logs from "./pages/sharing/Logs";

// Memory sub-pages
import Timeline from "./pages/memory/Timeline";
import Recall from "./pages/memory/Recall";
import MemoryPermissions from "./pages/memory/Permissions";

// Admin sub-pages
import Queue from "./pages/admin/Queue";
import PatientRecords from "./pages/admin/PatientRecords";
import StreamSupervision from "./pages/admin/StreamSupervision";
import Staff from "./pages/admin/Staff";
import Reports from "./pages/admin/Reports";
import Audit from "./pages/admin/Audit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RTLProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/home/context" element={<Context />} />
          <Route path="/home/actions" element={<Actions />} />
          <Route path="/home/matches" element={<Matches />} />
          <Route path="/home/aifeed" element={<AIFeed />} />
          
          {/* Backwards compatibility redirects */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard/context" element={<Navigate to="/home/context" replace />} />
          <Route path="/dashboard/actions" element={<Navigate to="/home/actions" replace />} />
          <Route path="/dashboard/matches" element={<Navigate to="/home/matches" replace />} />
          <Route path="/dashboard/aifeed" element={<Navigate to="/home/aifeed" replace />} />
          
          {/* Discover routes */}
          <Route path="/discover" element={<Discover />} />
          <Route path="/discover/wellness-services" element={<WellnessServices />} />
          <Route path="/discover/doctors-coaches" element={<DoctorsCoaches />} />
          <Route path="/discover/deals-offers" element={<DealsOffers />} />
          <Route path="/discover/orders" element={<Orders />} />
          
          {/* Health routes */}
          <Route path="/health" element={<Health />} />
          <Route path="/health/pillars" element={<PillarsOfHealth />} />
          <Route path="/health/services-hub" element={<HealthWellnessServices />} />
          <Route path="/health/conditions" element={<ConditionsRisks />} />
          <Route path="/health/education" element={<EducationResources />} />
          <Route path="/health/biomarker-results" element={<BiomarkerResults />} />
          <Route path="/health/my-health-tracker" element={<MyHealthTracker />} />
          
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
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calendar/month" element={<Month />} />
          <Route path="/calendar/week" element={<Week />} />
          <Route path="/calendar/day" element={<Day />} />
          <Route path="/calendar/appointments" element={<Appointments />} />
          <Route path="/calendar/events" element={<CalendarEvents />} />
          <Route path="/calendar/reminders" element={<Reminders />} />
          <Route path="/calendar/motivation" element={<Motivation />} />
          <Route path="/calendar/progress" element={<CalendarProgress />} />
          <Route path="/calendar/recommendations" element={<CalendarRecommendations />} />
          
          <Route path="/community" element={<Community />} />
          <Route path="/community/my-groups" element={<MyGroups />} />
          <Route path="/community/my-groups/:id" element={<GroupDetail />} />
          <Route path="/community/feed" element={<Feed />} />
          <Route path="/community/events" element={<CommunityEvents />} />
          <Route path="/community/live-rooms" element={<LiveRooms />} />
          <Route path="/community/live-rooms/:roomId/view" element={<LiveRoomViewer />} />
          <Route path="/community/media-hub" element={<MediaHub />} />
          <Route path="/community/my-business" element={<MyBusiness />} />
          <Route path="/community/meetups" element={<Meetups />} />
          
          <Route path="/ai" element={<AI />} />
          <Route path="/ai/insights" element={<Insights />} />
          <Route path="/ai/recommendations" element={<AIRecommendations />} />
          <Route path="/ai/daily-summary" element={<DailySummary />} />
          <Route path="/ai/companion" element={<Companion />} />
          
          {/* Redirect legacy /messages routes to /inbox */}
          <Route path="/messages/*" element={<Navigate to="/inbox" replace />} />
          
          <Route path="/inbox" element={<Messages />} />
          <Route path="/inbox/direct" element={<Direct />} />
          <Route path="/inbox/group" element={<Group />} />
          <Route path="/inbox/notifications" element={<MessagesNotifications />} />
          <Route path="/inbox/archived" element={<Archived />} />
          <Route path="/inbox/reminder" element={<Reminder />} />
          <Route path="/inbox/inspiration" element={<Inspiration />} />
          
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/notifications" element={<SettingsNotifications />} />
          <Route path="/settings/preferences" element={<Preferences />} />
          <Route path="/settings/connected-apps" element={<ConnectedApps />} />
          <Route path="/settings/tenant-role" element={<TenantRole />} />
          <Route path="/settings/billing" element={<Billing />} />
          <Route path="/settings/support" element={<Support />} />
          <Route path="/profile" element={<Navigate to="/me/profile" replace />} />
          <Route path="/profile/:id" element={<LegacyProfileRedirect />} />
          <Route path="/me/profile" element={<EditProfilePage />} />
          <Route path="/search" element={<Search />} />
          <Route path="/u/:handle" element={<PublicProfilePage />} />
          
          {/* New module routes */}
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/wallet/balance" element={<Balance />} />
          <Route path="/wallet/subscriptions" element={<Subscriptions />} />
          <Route path="/wallet/rewards" element={<Rewards />} />
          
          <Route path="/sharing" element={<Sharing />} />
          <Route path="/sharing/consent" element={<Consent />} />
          <Route path="/sharing/packages" element={<Packages />} />
          <Route path="/sharing/smart-package" element={<SmartPackage />} />
          <Route path="/sharing/marketplace" element={<Marketplace />} />
          <Route path="/sharing/logs" element={<Logs />} />
          
          <Route path="/memory" element={<Memory />} />
          <Route path="/memory/timeline" element={<Timeline />} />
          <Route path="/memory/recall" element={<Recall />} />
          <Route path="/memory/permissions" element={<MemoryPermissions />} />
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="staff">
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/queue" element={
            <ProtectedRoute requiredRole="staff">
              <Queue />
            </ProtectedRoute>
          } />
          <Route path="/admin/patient-records" element={
            <ProtectedRoute requiredRole="staff">
              <PatientRecords />
            </ProtectedRoute>
          } />
          <Route path="/admin/stream-supervision" element={
            <ProtectedRoute requiredRole="staff">
              <StreamSupervision />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute requiredRole="staff">
              <Staff />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute requiredRole="staff">
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute requiredRole="staff">
              <Audit />
            </ProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </RTLProvider>
  </QueryClientProvider>
);

export default App;