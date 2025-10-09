import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantDetector } from "@/components/TenantDetector";
import PresenceDebugPanel from "@/components/debug/PresenceDebugPanel";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthGuard from "@/components/AuthGuard";
import { RTLProvider } from "@/components/RTLProvider";
import { MeetupSelectionProvider } from "@/context/MeetupSelectionContext";
import { EventSelectionProvider } from "@/context/EventSelectionContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";

// Portal pages
import ExafyAdminPortal from "./pages/portals/ExafyAdminPortal";
import MaxinaPortal from "./pages/portals/MaxinaPortal";
import AlkalmaPortal from "./pages/portals/AlkalmaPortal";
import EarthlinksPortal from "./pages/portals/EarthlinksPortal";
import CommunityPortal from "./pages/portals/CommunityPortal";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Supplements from "./pages/discover/Supplements";
import Health from "./pages/Health";
import HealthTracker from "./pages/HealthTracker";
import Calendar from "./pages/Calendar";
import Community from "./pages/Community";
import AI from "./pages/AI";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";

// Email confirmation pages
import EmailConfirmed from "./pages/auth/EmailConfirmed";
import MaxinaConfirmed from "./pages/portals/MaxinaConfirmed";
import AlkalmaConfirmed from "./pages/portals/AlkalmaConfirmed";
import EarthlinksConfirmed from "./pages/portals/EarthlinksConfirmed";
import CommunityConfirmed from "./pages/portals/CommunityConfirmed";
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
import TenantManagement from "./pages/admin/TenantManagement";

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
import MyBiology from "./pages/health/MyBiology";

// Health Tracker sub-pages - REMOVED (redirected to /health/my-health-tracker)

// Calendar sub-pages - REMOVED (using universal popup system)

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
import Distribution from "./pages/sharing/Distribution";
import DataConsent from "./pages/sharing/DataConsent";
import Integrations from "./pages/sharing/Integrations";
import Campaigns from "./pages/sharing/Campaigns";
import CampaignDetail from "./pages/sharing/CampaignDetail";

// Memory sub-pages
import Timeline from "./pages/memory/Timeline";
import Recall from "./pages/memory/Recall";
import MemoryPermissions from "./pages/memory/Permissions";
import Diary from "./pages/memory/Diary";

// Admin sub-pages
import Queue from "./pages/admin/Queue";
import PatientRecords from "./pages/admin/PatientRecords";
import StreamSupervision from "./pages/admin/StreamSupervision";
import Staff from "./pages/admin/Staff";
import Bootstrap from "./pages/admin/Bootstrap";
import Reports from "./pages/admin/Reports";
import Audit from "./pages/admin/Audit";
import UserManagement from "./pages/admin/UserManagement";

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
    <RTLProvider>
      <MeetupSelectionProvider>
        <EventSelectionProvider>
          <TooltipProvider>
            <Toaster />
            <PresenceDebugPanel />
            <BrowserRouter>
              <TenantDetector />
              <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* Email Confirmation Routes */}
          <Route path="/auth/confirmed" element={<EmailConfirmed />} />
          <Route path="/maxina/confirmed" element={<MaxinaConfirmed />} />
          <Route path="/alkalma/confirmed" element={<AlkalmaConfirmed />} />
          <Route path="/earthlinks/confirmed" element={<EarthlinksConfirmed />} />
          <Route path="/community/confirmed" element={<CommunityConfirmed />} />
          
          {/* Portal Routes */}
          <Route path="/exafy-admin" element={<ExafyAdminPortal />} />
          <Route path="/maxina" element={<MaxinaPortal />} />
          <Route path="/alkalma" element={<AlkalmaPortal />} />
          <Route path="/earthlinks" element={<EarthlinksPortal />} />
          <Route path="/community" element={<CommunityPortal />} />
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
          <Route path="/comm/my-groups" element={
            <AuthGuard>
              <MyGroups />
            </AuthGuard>
          } />
          <Route path="/comm/my-groups/:id" element={
            <AuthGuard>
              <GroupDetail />
            </AuthGuard>
          } />
          <Route path="/comm/feed" element={
            <AuthGuard>
              <Feed />
            </AuthGuard>
          } />
          <Route path="/comm/events" element={
            <AuthGuard>
              <CommunityEvents />
            </AuthGuard>
          } />
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
          <Route path="/comm/my-business" element={
            <AuthGuard>
              <MyBusiness />
            </AuthGuard>
          } />
          <Route path="/comm/meetups" element={
            <AuthGuard>
              <Meetups />
            </AuthGuard>
          } />
          
          {/* Redirect old community routes */}
          <Route path="/community/my-groups" element={<Navigate to="/comm/my-groups" replace />} />
          <Route path="/community/feed" element={<Navigate to="/comm/feed" replace />} />
          <Route path="/community/events" element={<Navigate to="/comm/events" replace />} />
          <Route path="/community/live-rooms" element={<Navigate to="/comm/live-rooms" replace />} />
          <Route path="/community/media-hub" element={<Navigate to="/comm/media-hub" replace />} />
          <Route path="/community/my-business" element={<Navigate to="/comm/my-business" replace />} />
          
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
                <Settings />
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
          <Route path="/sharing/integrations" element={
            <AuthGuard>
              <Integrations />
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

          {/* Admin Role Routes */}
          <Route path="/admin/dashboard" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/users" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/user-management" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/system" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1 className="text-3xl font-bold">System Health</h1><p className="text-muted-foreground">Monitor system performance and status</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/analytics" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1 className="text-3xl font-bold">Analytics</h1><p className="text-muted-foreground">Usage statistics and insights</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/security" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1 className="text-3xl font-bold">Security</h1><p className="text-muted-foreground">Security settings and access control</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/settings" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="admin">
                <div className="p-6"><h1 className="text-3xl font-bold">System Settings</h1><p className="text-muted-foreground">Global system configuration</p></div>
              </ProtectedRoute>
            </AuthGuard>
          } />

          {/* Admin Pages - Keep existing admin routes */}
          <Route path="/admin" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <Admin />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/bootstrap" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <Bootstrap />
              </ProtectedRoute>
            </AuthGuard>
          } />
          <Route path="/admin/tenant-management" element={
            <AuthGuard>
              <ProtectedRoute requiredRole="staff">
                <TenantManagement />
              </ProtectedRoute>
            </AuthGuard>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
      </EventSelectionProvider>
    </MeetupSelectionProvider>
  </RTLProvider>
  );
};

export default App;