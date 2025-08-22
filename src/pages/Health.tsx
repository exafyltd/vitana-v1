import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Droplets, Apple, Dumbbell, Moon, Brain, Stethoscope, Target, AlertTriangle, BookOpen, Users, Calendar, ShoppingBag, Activity, Star, TrendingUp, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import HealthCoachChat from "@/components/health/HealthCoachChat";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "pillars", name: "Pillars of Health", path: "/health/pillars" },
  { id: "services", name: "Wellness Services", path: "/health/services" },
  { id: "conditions", name: "Conditions & Risks", path: "/health/conditions" },
  { id: "education", name: "Education & Resources", path: "/health/education" },
  { id: "biomarker-results", name: "Biomarker Results", path: "/health/biomarker-results" },
];

const overviewCards = [
  {
    title: "Vitana Index Summary",
    description: "View your high-level health score",
    icon: Heart,
    path: "/health-tracker/vitana-index",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Pillars of Health",
    description: "Explore hydration, nutrition, exercise, sleep & mental wellbeing",
    icon: Target,
    path: "/health/pillars",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Wellness Services",
    description: "Book doctors, coaching, programs & screenings",
    icon: Stethoscope,
    path: "/health/services",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Lab Results",
    description: "View your biomarker analysis and lab test results",
    icon: FileText,
    path: "/health/biomarker-results",
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "Conditions & Risks",
    description: "Risk assessments & preventive action plans",
    icon: AlertTriangle,
    path: "/health/conditions",
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Education & Resources",
    description: "Articles, videos, podcasts & learning materials",
    icon: BookOpen,
    path: "/health/education",
    color: "from-purple-500/20 to-violet-500/20",
  },
];

export default function Health() {
  const navigate = useNavigate();

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

  return (
    <AppLayout>
      <SEO title="Health" description="Discover health services, programs, and educational resources" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Vitana Index Integration */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Let's improve quality of life! 🌱</h1>
                <p className="text-muted-foreground">Discover health services, programs, and educational resources to enhance your wellness journey.</p>
              </div>
              {/* Vitana Index Circle - Compact */}
              <div 
                className="cursor-pointer group flex-shrink-0 mr-16"
                onClick={() => navigate('/health-tracker/vitana-index')}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

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
    </AppLayout>
  );
}