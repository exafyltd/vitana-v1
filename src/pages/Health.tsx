import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Droplets, Apple, Dumbbell, Moon, Brain, Stethoscope, Target, AlertTriangle, BookOpen, Users, Calendar, ShoppingBag, Activity, Star, TrendingUp, User, FileText, Plane } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

import StandardHeader from "@/components/StandardHeader";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Health() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
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
  }, []);

  return (
    <AppLayout>
      <SEO title="Health" description="Discover health services, programs, and educational resources" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Let's improve quality of life!"
            description="Discover health services, programs, and educational resources to enhance your wellness journey."
            emoji="🌱"
          />

          {/* Intelligent Layer - Autopilot & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SmartSuggestions 
                suggestions={smartSuggestions}
                title="AI Health Insights"
                variant="list"
              />
            </div>
            <div>
              <AutopilotWidget 
                sectionName="Health"
                suggestions={autopilotSuggestions}
                isEnabled={true}
                variant="card"
              />
            </div>
          </div>

          {/* Main Health Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overviewCards.map((card) => (
              <Card 
                key={card.title}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur-sm border-border/20 hover:scale-105 group"
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <card.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Community & Communication Integration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-calendar-primary" />
                  Health Community
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">Mediterranean Diet Group</span>
                    <span className="text-xs text-muted-foreground">3 nearby</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">Morning Joggers</span>
                    <span className="text-xs text-muted-foreground">12 members</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm">Mindfulness Circle</span>
                    <span className="text-xs text-muted-foreground">8 members</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <HealthCoachChat 
              context="general"
              variant="card"
            />
          </div>
        </div>
      </div>
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.HEALTH_OVERVIEW);