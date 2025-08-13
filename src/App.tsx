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

// Discover sub-pages
import Trending from "./pages/discover/Trending";
import Recommendations from "./pages/discover/Recommendations";
import Saved from "./pages/discover/Saved";

// Calendar sub-pages
import Week from "./pages/calendar/Week";
import Day from "./pages/calendar/Day";
import Appointments from "./pages/calendar/Appointments";
import Events from "./pages/calendar/Events";
import Reminders from "./pages/calendar/Reminders";

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
          <Route path="/dashboard/*" element={<Dashboard />} />
          
          {/* Discover routes */}
          <Route path="/discover" element={<Discover />} />
          <Route path="/discover/trending" element={<Trending />} />
          <Route path="/discover/recommendations" element={<Recommendations />} />
          <Route path="/discover/saved" element={<Saved />} />
          
          <Route path="/health/*" element={<Health />} />
          
          {/* Calendar routes */}
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/calendar/week" element={<Week />} />
          <Route path="/calendar/day" element={<Day />} />
          <Route path="/calendar/appointments" element={<Appointments />} />
          <Route path="/calendar/events" element={<Events />} />
          <Route path="/calendar/reminders" element={<Reminders />} />
          
          <Route path="/community/*" element={<Community />} />
          <Route path="/ai/*" element={<AI />} />
          <Route path="/messages/*" element={<Messages />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
