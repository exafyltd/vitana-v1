import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Smartphone, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  return (
    <AppLayout>
      <SEO title="Health Tracker" description="Track your personal health data and monitor wellness progress" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Let's track your progress together, Jovana! 📊
            </h1>
            <p className="text-muted-foreground">Monitor your personal health data, track progress, and gain insights from your wellness journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {overviewCards.map((card) => (
              <Card 
                key={card.title}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105"
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
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
        </div>
      </div>
    </AppLayout>
  );
}