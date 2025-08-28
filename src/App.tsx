import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RTLProvider } from "@/components/RTLProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
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
import UserProfile from "./pages/UserProfile";
import Wallet from "./pages/Wallet";
import Sharing from "./pages/Sharing";
import Memory from "./pages/Memory";
import Admin from "./pages/Admin";

// Dashboard sub-pages
import Context from "./pages/dashboard/Context";
import Actions from "./pages/dashboard/Actions";
import Matches from "./pages/dashboard/Matches";
import AIFeed from "./pages/dashboard/AIFeed";

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

// Health Tracker sub-pages
import MyVitanaIndex from "./pages/healthtracker/MyVitanaIndex";
import ConnectedDevices from "./pages/healthtracker/ConnectedDevices";
import DailyWeeklyTracking from "./pages/healthtracker/DailyWeeklyTracking";
import ProgressGoals from "./pages/healthtracker/ProgressGoals";
import Nutrition from "./pages/healthtracker/Nutrition";
import Hydration from "./pages/healthtracker/Hydration";
import Sleep from "./pages/healthtracker/Sleep";
import Exercise from "./pages/healthtracker/Exercise";
import MentalHealth from "./pages/healthtracker/MentalHealth";
import Trends from "./pages/healthtracker/Trends";

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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/context" element={<Context />} />
          <Route path="/dashboard/actions" element={<Actions />} />
          <Route path="/dashboard/matches" element={<Matches />} />
          <Route path="/dashboard/aifeed" element={<AIFeed />} />
          
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
          <Route path="/health/nutrition" element={<Nutrition />} />
          <Route path="/health/hydration" element={<Hydration />} />
          <Route path="/health/sleep" element={<Sleep />} />
          <Route path="/health/exercise" element={<Exercise />} />
          <Route path="/health/mental-health" element={<MentalHealth />} />
          <Route path="/health/trends" element={<Trends />} />
          
          {/* Health Tracker routes */}
          <Route path="/health-tracker" element={<HealthTracker />} />
          <Route path="/health-tracker/vitana-index" element={<MyVitanaIndex />} />
          <Route path="/health-tracker/nutrition" element={<Nutrition />} />
          <Route path="/health-tracker/hydration" element={<Hydration />} />
          <Route path="/health-tracker/sleep" element={<Sleep />} />
          <Route path="/health-tracker/exercise" element={<Exercise />} />
          <Route path="/health-tracker/mental-health" element={<MentalHealth />} />
          <Route path="/health-tracker/trends" element={<Trends />} />
          <Route path="/health-tracker/devices" element={<ConnectedDevices />} />
          <Route path="/health-tracker/tracking" element={<DailyWeeklyTracking />} />
          <Route path="/health-tracker/progress" element={<ProgressGoals />} />
          <Route path="/health-tracker/biomarker-results" element={<BiomarkerResults />} />
          
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
          <Route path="/community/feed" element={<Feed />} />
          <Route path="/community/events" element={<CommunityEvents />} />
          <Route path="/community/live-rooms" element={<LiveRooms />} />
          <Route path="/community/media-hub" element={<MediaHub />} />
          <Route path="/community/my-business" element={<MyBusiness />} />
          <Route path="/community/meetups" element={<Meetups />} />
          
          <Route path="/ai" element={<AI />} />
          <Route path="/ai/insights" element={<Insights />} />
          <Route path="/ai/recommendations" element={<AIRecommendations />} />
          <Route path="/ai/daily-summary" element={<DailySummary />} />
          <Route path="/ai/companion" element={<Companion />} />
          
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/direct" element={<Direct />} />
          <Route path="/messages/group" element={<Group />} />
          <Route path="/messages/notifications" element={<MessagesNotifications />} />
          <Route path="/messages/archived" element={<Archived />} />
          <Route path="/messages/reminder" element={<Reminder />} />
          <Route path="/messages/inspiration" element={<Inspiration />} />
          
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/notifications" element={<SettingsNotifications />} />
          <Route path="/settings/preferences" element={<Preferences />} />
          <Route path="/settings/connected-apps" element={<ConnectedApps />} />
          <Route path="/settings/billing" element={<Billing />} />
          <Route path="/settings/support" element={<Support />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile/:id" element={<UserProfile />} />
          
          {/* New module routes */}
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/sharing" element={<Sharing />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="staff">
              <Admin />
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
