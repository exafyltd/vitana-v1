import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Apple, Dumbbell, Moon, Brain, Calendar } from "lucide-react";
import { healthTrackerNavigation } from "@/config/navigation";


const trackingCategories = [
  {
    title: "Hydration Log",
    description: "Track your daily water intake and hydration goals",
    icon: Droplets,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Nutrition Log",
    description: "Log meals, calories, and nutritional information",
    icon: Apple,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Activity & Exercise Log",
    description: "Record workouts, steps, and physical activities",
    icon: Dumbbell,
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Sleep Tracking",
    description: "Monitor sleep duration, quality, and patterns",
    icon: Moon,
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Mental Wellbeing Check-ins",
    description: "Track mood, stress levels, and mental health",
    icon: Brain,
    color: "from-pink-500/20 to-rose-500/20",
  },
];

export default function DailyWeeklyTracking() {
  return (
    <AppLayout>
      <SEO title="Daily & Weekly Tracking | Health Tracker" description="Log your daily health activities and monitor progress" canonical={window.location.href} />
      <SubNavigation items={healthTrackerNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Every day counts towards your goals! 📈"
            description="Log your daily health activities across all wellness pillars to monitor your progress."
            icon={Calendar}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trackingCategories.map((category) => (
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