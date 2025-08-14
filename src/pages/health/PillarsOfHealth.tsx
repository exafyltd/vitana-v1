import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Apple, Dumbbell, Moon, Brain } from "lucide-react";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "pillars", name: "Pillars of Health", path: "/health/pillars" },
  { id: "services", name: "Wellness Services", path: "/health/services" },
  { id: "conditions", name: "Conditions & Risks", path: "/health/conditions" },
  { id: "education", name: "Education & Resources", path: "/health/education" },
];

const pillars = [
  {
    title: "Hydration",
    description: "Tips, articles, and service links for optimal hydration",
    icon: Droplets,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Nutrition",
    description: "Meal plans and dietitian booking services",
    icon: Apple,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Exercise & Movement",
    description: "Workouts and physiotherapy booking",
    icon: Dumbbell,
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Sleep",
    description: "Sleep hygiene programs and sleep clinic bookings",
    icon: Moon,
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Mental & Emotional Wellbeing",
    description: "Coaching and meditation programs",
    icon: Brain,
    color: "from-pink-500/20 to-rose-500/20",
  },
];

export default function PillarsOfHealth() {
  return (
    <AppLayout>
      <SEO title="Pillars of Health | Health" description="Explore the five pillars of health and wellness" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-2xl font-semibold mb-4">Pillars of Health</h1>
            <p className="text-muted-foreground">Explore the five fundamental pillars of health and discover resources to enhance each area of your wellness.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((pillar) => (
              <Card key={pillar.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-4`}>
                    <pillar.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {pillar.description}
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