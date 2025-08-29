import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Smartphone, Calendar, TrendingUp, Droplets, Apple, Dumbbell, Moon, Brain, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { Progress } from "@/components/ui/progress";
import { healthNavigation } from "@/config/navigation";


const overviewCards = [
  {
    title: "My Vitana Index",
    description: "Detailed health score breakdown with biomarkers & genomics",
    icon: Activity,
    path: "/health/my-health-tracker",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Connected Devices & Apps",
    description: "Sync wearables, IoT devices & health apps",
    icon: Smartphone,
    path: "/health/my-health-tracker",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Daily & Weekly Tracking",
    description: "Log hydration, nutrition, activity, sleep & mental wellbeing",
    icon: Calendar,
    path: "/health/my-health-tracker",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Progress & Goals",
    description: "Track goals, AI insights, reports & historical data",
    icon: TrendingUp,
    path: "/health/my-health-tracker",
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Biomarker Analysis",
    description: "Review lab test results and track biomarker trends",
    icon: FileText,
    path: "/health/my-health-tracker",
    color: "from-emerald-500/20 to-teal-500/20",
  },
];

export default function HealthTracker() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("HealthTracker page using healthNavigation:", healthNavigation);
    console.log("Current path:", window.location.pathname);
  }, []);

  const pillarData = [
    { name: "Hydration", score: 85, icon: Droplets, color: "text-blue-500", progress: 85 },
    { name: "Nutrition", score: 72, icon: Apple, color: "text-green-500", progress: 72 },
    { name: "Exercise", score: 68, icon: Dumbbell, color: "text-orange-500", progress: 68 },
    { name: "Sleep", score: 81, icon: Moon, color: "text-purple-500", progress: 81 },
    { name: "Mental", score: 77, icon: Brain, color: "text-pink-500", progress: 77 }
  ];

  const trackerInsights = [
    {
      title: "Missing Sleep Data",
      description: "No sleep logged for 2 days. Connect your wearable or log manually.",
      type: "alert" as const,
      priority: "high" as const,
      action: "Log Sleep"
    },
    {
      title: "Hydration Pattern Detected",
      description: "You drink 40% less water on weekends. Set weekend reminders?",
      type: "insight" as const,
      priority: "medium" as const,
      action: "Set Reminders"
    },
    {
      title: "Exercise Streak: 7 Days!",
      description: "Great job! Your consistency is improving your overall score.",
      type: "recommendation" as const,
      priority: "low" as const,
      action: "Share Achievement"
    }
  ];

  const autopilotSuggestions = [
    "Auto-sync missing fitness data from Apple Health",
    "Log water intake based on your routine patterns",
    "Schedule rest day - you've been consistent for 7 days"
  ];

  return (
    <AppLayout>
      <SEO title="Health Tracker" description="Track your personal health data and monitor wellness progress" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Shortened Header Bar - Welcome Message Only */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Let's track your progress together! 📊</h1>
                <p className="text-muted-foreground">Monitor your personal health data, track progress, and gain insights from your wellness journey.</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health/my-health-tracker')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillars Overview with Gamification */}
          <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-calendar-primary" />
                Health Pillars Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {pillarData.map((pillar) => (
                  <div key={pillar.name} className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-gradient-to-br from-calendar-primary/10 to-calendar-secondary/10 flex items-center justify-center">
                      <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
                    </div>
                    <h3 className="font-medium text-foreground">{pillar.name}</h3>
                    <div className="space-y-1">
                      <Progress value={pillar.progress} className="h-2" />
                      <span className="text-sm font-bold text-foreground">{pillar.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Intelligent Insights & Autopilot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SmartSuggestions 
                suggestions={trackerInsights}
                title="Tracking Insights & Patterns"
                variant="list"
              />
            </div>
            <div>
              <AutopilotWidget 
                sectionName="Health Tracker"
                suggestions={autopilotSuggestions}
                isEnabled={true}
                variant="card"
              />
            </div>
          </div>

          {/* Main Tracking Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Quick Actions & Memory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-calendar-success/5 to-calendar-accent/5 border-calendar-success/20">
              <CardHeader>
                <CardTitle className="text-lg">Quick Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-3 rounded-lg bg-background/50 cursor-pointer hover:bg-background/80 transition-colors">
                    <Droplets className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                    <span className="text-xs">Water</span>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50 cursor-pointer hover:bg-background/80 transition-colors">
                    <Apple className="w-6 h-6 mx-auto mb-1 text-green-500" />
                    <span className="text-xs">Meal</span>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50 cursor-pointer hover:bg-background/80 transition-colors">
                    <Dumbbell className="w-6 h-6 mx-auto mb-1 text-orange-500" />
                    <span className="text-xs">Workout</span>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background/50 cursor-pointer hover:bg-background/80 transition-colors">
                    <Brain className="w-6 h-6 mx-auto mb-1 text-pink-500" />
                    <span className="text-xs">Mood</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-calendar-accent/5 to-calendar-primary/5 border-calendar-accent/20">
              <CardHeader>
                <CardTitle className="text-lg">Today's Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-calendar-primary">7</div>
                  <p className="text-sm text-muted-foreground">Days of consistent tracking</p>
                  <div className="text-xs text-muted-foreground">🔥 Your best streak: 14 days</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-calendar-secondary/5 to-calendar-primary/5 border-calendar-secondary/20">
              <CardHeader>
                <CardTitle className="text-lg">Smart Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Weekly Exercise</span>
                      <span>4/5 days</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sleep Quality</span>
                      <span>6.8/10</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}