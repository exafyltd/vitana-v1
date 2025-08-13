import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Health from "./pages/Health";
import Calendar from "./pages/Calendar";
import Community from "./pages/Community";
import AI from "./pages/AI";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Dashboard sub-pages
import Member from "./pages/dashboard/Member";
import Toggle from "./pages/dashboard/Toggle";
import Summary from "./pages/dashboard/Summary";

// Discover sub-pages
import Trending from "./pages/discover/Trending";
import Recommendations from "./pages/discover/Recommendations";
import Saved from "./pages/discover/Saved";

// Health sub-pages
import VitanaIndex from "./pages/health/VitanaIndex";
import Nutrition from "./pages/health/Nutrition";
import Hydration from "./pages/health/Hydration";
import Sleep from "./pages/health/Sleep";
import Exercise from "./pages/health/Exercise";
import MentalHealth from "./pages/health/MentalHealth";
import Trends from "./pages/health/Trends";

// Calendar sub-pages
import Week from "./pages/calendar/Week";
import Day from "./pages/calendar/Day";
import Appointments from "./pages/calendar/Appointments";
import Events from "./pages/calendar/Events";
import Reminders from "./pages/calendar/Reminders";

// Community sub-pages
import Matchmaking from "./pages/community/Matchmaking";
import Groups from "./pages/community/Groups";
import Meetups from "./pages/community/Meetups";
import LiveRooms from "./pages/community/LiveRooms";
import Challenges from "./pages/community/Challenges";

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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/member" element={<Member />} />
          <Route path="/dashboard/toggle" element={<Toggle />} />
          <Route path="/dashboard/summary" element={<Summary />} />
          
          {/* Discover routes */}
          <Route path="/discover" element={<Discover />} />
          <Route path="/discover/trending" element={<Trending />} />
          <Route path="/discover/recommendations" element={<Recommendations />} />
          <Route path="/discover/saved" element={<Saved />} />
          
          <Route path="/health" element={<Health />} />
          <Route path="/health/vitana-index" element={<VitanaIndex />} />
          <Route path="/health/nutrition" element={<Nutrition />} />
          <Route path="/health/hydration" element={<Hydration />} />
          <Route path="/health/sleep" element={<Sleep />} />
          <Route path="/health/exercise" element={<Exercise />} />
          <Route path="/health/mental-health" element={<MentalHealth />} />
          <Route path="/health/trends" element={<Trends />} />
          
          {/* Calendar routes */}
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calendar/week" element={<Week />} />
          <Route path="/calendar/day" element={<Day />} />
          <Route path="/calendar/appointments" element={<Appointments />} />
          <Route path="/calendar/events" element={<Events />} />
          <Route path="/calendar/reminders" element={<Reminders />} />
          
          <Route path="/community" element={<Community />} />
          <Route path="/community/matchmaking" element={<Matchmaking />} />
          <Route path="/community/groups" element={<Groups />} />
          <Route path="/community/meetups" element={<Meetups />} />
          <Route path="/community/live-rooms" element={<LiveRooms />} />
          <Route path="/community/challenges" element={<Challenges />} />
          
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
          
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/notifications" element={<SettingsNotifications />} />
          <Route path="/settings/preferences" element={<Preferences />} />
          <Route path="/settings/connected-apps" element={<ConnectedApps />} />
          <Route path="/settings/billing" element={<Billing />} />
          <Route path="/settings/support" element={<Support />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
