import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Smartphone, Calendar, TrendingUp, Droplets, Apple, Dumbbell, Moon, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VitanaIndexMini from "@/components/health/VitanaIndexMini";
import AutopilotWidget from "@/components/health/AutopilotWidget";
import SmartSuggestions from "@/components/health/SmartSuggestions";
import { Progress } from "@/components/ui/progress";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

const overviewCards = [
  {
    title: "My Vitana Index",
    description: "Detailed health score breakdown with biomarkers & genomics",
    icon: Activity,
    path: "/health-tracker/vitana-index",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Connected Devices & Apps",
    description: "Sync wearables, IoT devices & health apps",
    icon: Smartphone,
    path: "/health-tracker/devices",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Daily & Weekly Tracking",
    description: "Log hydration, nutrition, activity, sleep & mental wellbeing",
    icon: Calendar,
    path: "/health-tracker/tracking",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Progress & Goals",
    description: "Track goals, AI insights, reports & historical data",
    icon: TrendingUp,
    path: "/health-tracker/progress",
    color: "from-purple-500/20 to-violet-500/20",
  },
];

export default function HealthTracker() {
  const navigate = useNavigate();

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
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Vitana Index as Central Anchor */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/20">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Let's track your progress together! 📊</h1>
                <p className="text-muted-foreground">Monitor your personal health data, track progress, and gain insights from your wellness journey.</p>
              </div>
              <div className="lg:w-96">
                <VitanaIndexMini score={75} trend="up" showDetails={true} />
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
                title="Tracking Autopilot ⚡"
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