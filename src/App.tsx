import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RTLProvider } from "@/components/RTLProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";

// Portal pages
import ExafyAdminPortal from "./pages/portals/ExafyAdminPortal";
import MaxinaPortal from "./pages/portals/MaxinaPortal";
import AlkalmaPortal from "./pages/portals/AlkalmaPortal";
import EarthlingsPortal from "./pages/portals/EarthlingsPortal";
import CommunityPortal from "./pages/portals/CommunityPortal";
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
// Role-specific dashboards
import PatientDashboard from "./pages/patient/Dashboard";
import PatientHealth from "./pages/patient/Health";
import PatientAppointments from "./pages/patient/Appointments";
import ProfessionalDashboard from "./pages/professional/Dashboard";
import ProfessionalPatients from "./pages/professional/Patients";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffQueue from "./pages/staff/Queue";
import AdminDashboard from "./pages/admin/Dashboard";

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
import TenantManagement from "./pages/admin/TenantManagement";
import Reports from "./pages/admin/Reports";
import Audit from "./pages/admin/Audit";

const App = () => (
  <RTLProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* Portal Routes */}
          <Route path="/exafy-admin" element={<ExafyAdminPortal />} />
          <Route path="/maxina" element={<MaxinaPortal />} />
          <Route path="/alkalma" element={<AlkalmaPortal />} />
          <Route path="/earthlings" element={<EarthlingsPortal />} />
          <Route path="/community" element={<CommunityPortal />} />
          <Route path="/home" element={
            <ProtectedRoute requiredRole="community">
              <Home />
            </ProtectedRoute>
          } />
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
          
          <Route path="/comm" element={<Community />} />
          <Route path="/comm/my-groups" element={<MyGroups />} />
          <Route path="/comm/my-groups/:id" element={<GroupDetail />} />
          <Route path="/comm/feed" element={<Feed />} />
          <Route path="/comm/events" element={<CommunityEvents />} />
          <Route path="/comm/live-rooms" element={<LiveRooms />} />
          <Route path="/comm/live-rooms/:roomId/view" element={<LiveRoomViewer />} />
          <Route path="/comm/media-hub" element={<MediaHub />} />
          <Route path="/comm/my-business" element={<MyBusiness />} />
          <Route path="/comm/meetups" element={<Meetups />} />
          
          {/* Redirect old community routes */}
          <Route path="/community/my-groups" element={<Navigate to="/comm/my-groups" replace />} />
          <Route path="/community/feed" element={<Navigate to="/comm/feed" replace />} />
          <Route path="/community/events" element={<Navigate to="/comm/events" replace />} />
          <Route path="/community/live-rooms" element={<Navigate to="/comm/live-rooms" replace />} />
          <Route path="/community/media-hub" element={<Navigate to="/comm/media-hub" replace />} />
          <Route path="/community/my-business" element={<Navigate to="/comm/my-business" replace />} />
          
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
          
          <Route path="/settings" element={
            <ProtectedRoute requiredRole="community">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/notifications" element={<SettingsNotifications />} />
          <Route path="/settings/preferences" element={<Preferences />} />
          <Route path="/settings/connected-apps" element={<ConnectedApps />} />
          <Route path="/settings/tenant-role" element={
            <ProtectedRoute requiredRole="community">
              <TenantRole />
            </ProtectedRoute>
          } />
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
          {/* Patient Role Routes */}
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/health" element={<PatientHealth />} />
          <Route path="/patient/appointments" element={<PatientAppointments />} />
          <Route path="/patient/results" element={<div className="p-6"><h1 className="text-3xl font-bold">Test Results</h1><p className="text-muted-foreground">Patient test results and lab reports</p></div>} />
          <Route path="/patient/care-team" element={<div className="p-6"><h1 className="text-3xl font-bold">Care Team</h1><p className="text-muted-foreground">Your healthcare providers and specialists</p></div>} />
          <Route path="/patient/goals" element={<div className="p-6"><h1 className="text-3xl font-bold">Health Goals</h1><p className="text-muted-foreground">Track and manage your health objectives</p></div>} />
          <Route path="/patient/insurance" element={<div className="p-6"><h1 className="text-3xl font-bold">Insurance</h1><p className="text-muted-foreground">Insurance information and coverage details</p></div>} />
          <Route path="/patient/notifications" element={<div className="p-6"><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">Health reminders and alerts</p></div>} />

          {/* Professional Role Routes */}
          <Route path="/professional/dashboard" element={<ProfessionalDashboard />} />
          <Route path="/professional/patients" element={<ProfessionalPatients />} />
          <Route path="/professional/schedule" element={<div className="p-6"><h1 className="text-3xl font-bold">Schedule</h1><p className="text-muted-foreground">Manage your appointment calendar</p></div>} />
          <Route path="/professional/tools" element={<div className="p-6"><h1 className="text-3xl font-bold">Clinical Tools</h1><p className="text-muted-foreground">Medical calculators and reference tools</p></div>} />
          <Route path="/professional/referrals" element={<div className="p-6"><h1 className="text-3xl font-bold">Referrals</h1><p className="text-muted-foreground">Patient referrals and specialist networks</p></div>} />
          <Route path="/professional/billing" element={<div className="p-6"><h1 className="text-3xl font-bold">Billing</h1><p className="text-muted-foreground">Practice billing and revenue management</p></div>} />
          <Route path="/professional/profile" element={<div className="p-6"><h1 className="text-3xl font-bold">Professional Profile</h1><p className="text-muted-foreground">Manage your professional credentials and bio</p></div>} />
          <Route path="/professional/education" element={<div className="p-6"><h1 className="text-3xl font-bold">Continuing Education</h1><p className="text-muted-foreground">CME courses and professional development</p></div>} />

          {/* Staff Role Routes */}
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/queue" element={<StaffQueue />} />
          <Route path="/staff/tasks" element={<div className="p-6"><h1 className="text-3xl font-bold">Daily Tasks</h1><p className="text-muted-foreground">Your assigned tasks and responsibilities</p></div>} />
          <Route path="/staff/schedule" element={<div className="p-6"><h1 className="text-3xl font-bold">Schedule</h1><p className="text-muted-foreground">Work schedule and shift management</p></div>} />
          <Route path="/staff/reports" element={<div className="p-6"><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Daily and weekly activity reports</p></div>} />
          <Route path="/staff/communications" element={<div className="p-6"><h1 className="text-3xl font-bold">Communications</h1><p className="text-muted-foreground">Team messages and announcements</p></div>} />
          <Route path="/staff/tools" element={<div className="p-6"><h1 className="text-3xl font-bold">Staff Tools</h1><p className="text-muted-foreground">Workflow tools and resources</p></div>} />
          <Route path="/staff/time" element={<div className="p-6"><h1 className="text-3xl font-bold">Time Tracking</h1><p className="text-muted-foreground">Clock in/out and timesheet management</p></div>} />

          {/* Admin Role Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<div className="p-6"><h1 className="text-3xl font-bold">User Management</h1><p className="text-muted-foreground">Manage system users and permissions</p></div>} />
          <Route path="/admin/system" element={<div className="p-6"><h1 className="text-3xl font-bold">System Health</h1><p className="text-muted-foreground">Monitor system performance and status</p></div>} />
          <Route path="/admin/analytics" element={<div className="p-6"><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground">Usage statistics and insights</p></div>} />
          <Route path="/admin/security" element={<div className="p-6"><h1 className="text-3xl font-bold">Security</h1><p className="text-muted-foreground">Security settings and access control</p></div>} />
          <Route path="/admin/settings" element={<div className="p-6"><h1 className="text-3xl font-bold">System Settings</h1><p className="text-muted-foreground">Global system configuration</p></div>} />
          
          {/* Admin Pages - Keep existing admin routes */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </RTLProvider>
);

export default App;