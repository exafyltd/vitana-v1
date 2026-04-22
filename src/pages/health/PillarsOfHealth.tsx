import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Apple, Dumbbell, Moon, Brain, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { healthNavigation } from "@/config/navigation";


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
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Pillars of Health | Health" description="Explore the five pillars of health and wellness" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Shortened Header Bar - Welcome Message Only */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Build your foundation for wellness! 🏗️</h1>
                <p className="text-muted-foreground">Explore the five fundamental pillars of health and discover resources to enhance each area of your wellness.</p>
              </div>
            </div>
            
            {/* Small Index Card - Only Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600"><VitanaIndexValue /></span>
                </div>
              </div>
            </div>
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