import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Brain, BarChart3, Calendar, TrendingUp, Share } from "lucide-react";

const healthTrackerSubItems = [
  { id: "overview", name: "Overview", path: "/health-tracker" },
  { id: "vitana-index", name: "My Vitana Index", path: "/health-tracker/vitana-index" },
  { id: "devices", name: "Connected Devices & Apps", path: "/health-tracker/devices" },
  { id: "tracking", name: "Daily & Weekly Tracking", path: "/health-tracker/tracking" },
  { id: "progress", name: "Progress & Goals", path: "/health-tracker/progress" },
];

const progressCategories = [
  {
    title: "Personal Health Goals",
    description: "Set and track weight, sleep hours, and fitness milestones",
    icon: Target,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "AI Predictions & Risk Warnings",
    description: "AI-powered health insights and risk assessments",
    icon: Brain,
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Reports & Trends",
    description: "Comprehensive health reports and trend analysis",
    icon: BarChart3,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Historical Data Visualization",
    description: "Visual representation of your health journey",
    icon: TrendingUp,
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Compare Periods",
    description: "Compare different time periods in your health data",
    icon: Calendar,
    color: "from-teal-500/20 to-cyan-500/20",
  },
  {
    title: "Share with Provider",
    description: "Share health data and reports with healthcare providers",
    icon: Share,
    color: "from-pink-500/20 to-rose-500/20",
  },
];

export default function ProgressGoals() {
  return (
    <AppLayout>
      <SEO title="Progress & Goals | Health Tracker" description="Track your health goals and analyze progress with AI insights" canonical={window.location.href} />
      <SubNavigation items={healthTrackerSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-2xl font-semibold mb-4">Progress & Goals</h1>
            <p className="text-muted-foreground">Track your personal health goals, analyze progress with AI insights, and share data with healthcare providers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progressCategories.map((category) => (
              <Card key={category.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-4`}>
                    <category.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {category.description}
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