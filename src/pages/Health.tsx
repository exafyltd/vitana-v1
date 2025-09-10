import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Droplets, Apple, Dumbbell, Moon, Brain, Stethoscope, Target, AlertTriangle, BookOpen, Users, Calendar, ShoppingBag, Activity, Star, TrendingUp, User, FileText, Plane, Search } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { HealthMasterActionPopup } from "@/components/HealthMasterActionPopup";
import { Universal3CardHeader } from "@/components/Universal3CardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { NewsCard } from "@/components/crossover/NewsCard";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import HealthCoachChat from "@/components/health/HealthCoachChat";

import { healthNavigation } from "@/config/navigation";

const overviewCards = [
  {
    title: "Overview",
    description: "Your comprehensive health dashboard and wellness overview",
    icon: Target,
    path: "/health",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Services Hub",
    description: "Book doctors, coaching, programs & screenings",
    icon: Stethoscope,
    path: "/health/services-hub",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Biomarkers",
    description: "View your latest test results and biomarkers",
    icon: FileText,
    path: "/health/biomarker-results",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "My Health Tracker",
    description: "Track your daily nutrition, sleep, exercise and wellness metrics",
    icon: Activity,
    path: "/health-tracker",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Education & Science",
    description: "Learn about health topics and access wellness resources",
    icon: BookOpen,
    path: "/health/education",
    color: "from-purple-500/20 to-indigo-500/20",
  },
];

import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Health() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [healthActionsOpen, setHealthActionsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  const smartSuggestions = [
    {
      title: "Book Annual Physical",
      description: "Your last checkup was 8 months ago. Schedule with Dr. Smith.",
      type: "action" as const,
      priority: "high" as const,
      action: "Book Now"
    },
    {
      title: "Sleep Score Trending Down",
      description: "Your sleep quality dropped 12% this week. Consider a sleep consultation.",
      type: "insight" as const,
      priority: "medium" as const,
      action: "Get Help"
    },
    {
      title: "Nutrition Community Match",
      description: "Join the Mediterranean Diet group - 3 members near you.",
      type: "recommendation" as const,
      priority: "low" as const,
      action: "Join Group"
    }
  ];

  const autopilotSuggestions = [
    "Book your overdue screening appointments", 
    "Join nutrition group based on your weak pillar",
    "Schedule stress management consultation"
  ];

  useEffect(() => {
    console.log("Health page using healthNavigation:", healthNavigation);
    console.log("Current path:", location.pathname);
  }, []);

  const newsItems = [
    {
      title: "New Mediterranean Diet Study Results",
      description: "Latest research shows 23% improvement in cardiovascular health markers",
      category: "wellness" as const,
      imageUrl: "/placeholder.svg",
      author: { name: "Dr. Sarah Chen", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
      location: "Stanford Medical",
      timestamp: "2 hours ago"
    },
    {
      title: "Community Wellness Challenge", 
      description: "Join 500+ members in our 30-day fitness challenge starting Monday",
      category: "community" as const,
      imageUrl: "/placeholder.svg", 
      author: { name: "Wellness Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
      location: "Global",
      timestamp: "4 hours ago"
    },
    {
      title: "Personalized Nutrition Plan Available",
      description: "AI-powered meal planning based on your biomarker results and preferences",
      category: "wellness" as const,
      imageUrl: "/placeholder.svg",
      author: { name: "NutriAI", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
      location: "Available Now",
      timestamp: "6 hours ago"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Health" description="Discover health services, programs, and educational resources" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      
      <Universal3CardHeader
        title="Let's improve quality of life!"
        description="Discover health services, programs, and educational resources to enhance your wellness journey."
        emoji="🌱"
        onAutopilotClick={() => setAutopilotOpen(true)}
      />

      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search health services, articles, or community..." />
            <Button
              onClick={() => setHealthActionsOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Heart className="w-4 h-4 mr-2" />
              Health Actions
            </Button>
          </UtilityActionButton>

          <SplitBar value="today" className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="today">Today</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="today" className="space-y-6">
              {/* Today's Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsItems.slice(0, 6).map((item, index) => (
                  <NewsCard key={index} {...item} />
                ))}
              </div>
              
              {/* Today's Smart Suggestions */}
              <SmartSuggestions 
                suggestions={smartSuggestions}
                title="Today's AI Health Insights"
                variant="list"
              />
              
              {/* Today's Community Activity */}
              <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-calendar-primary" />
                    Today's Health Community
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Mediterranean Diet Challenge</span>
                      <span className="text-xs text-muted-foreground">Starting today</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Morning Yoga Session</span>
                      <span className="text-xs text-muted-foreground">7:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Wellness Workshop</span>
                      <span className="text-xs text-muted-foreground">6:00 PM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="upcoming" className="space-y-6">
              {/* Upcoming Health Events */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsItems.slice(3, 9).map((item, index) => (
                  <NewsCard key={index} {...item} />
                ))}
              </div>
              
              {/* Upcoming Appointments & Events */}
              <Card className="bg-gradient-to-br from-calendar-accent/5 to-calendar-secondary/5 border-calendar-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-calendar-accent" />
                    Upcoming Health Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Annual Physical Exam</span>
                      <span className="text-xs text-muted-foreground">Next week</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Lab Results Review</span>
                      <span className="text-xs text-muted-foreground">March 20</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm">Nutrition Consultation</span>
                      <span className="text-xs text-muted-foreground">March 25</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upcoming Autopilot Suggestions */}
              <AutopilotWidget 
                sectionName="Upcoming Health"
                suggestions={["Schedule overdue screening", "Book nutrition consult", "Join fitness challenge"]}
                isEnabled={true}
                variant="card"
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
      
      <HealthMasterActionPopup
        open={healthActionsOpen}
        onOpenChange={setHealthActionsOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.HEALTH_OVERVIEW);