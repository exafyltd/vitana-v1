import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Droplets, Apple, Dumbbell, Moon, Brain, Stethoscope, Target, AlertTriangle, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "pillars", name: "Pillars of Health", path: "/health/pillars" },
  { id: "services", name: "Wellness Services", path: "/health/services" },
  { id: "conditions", name: "Conditions & Risks", path: "/health/conditions" },
  { id: "education", name: "Education & Resources", path: "/health/education" },
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

  return (
    <AppLayout>
      <SEO title="Health" description="Discover health services, programs, and educational resources" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Here's how we'll boost your wellness this week, Jovana! 🌱
            </h1>
            <p className="text-muted-foreground">Discover health services, programs, and educational resources to enhance your wellness journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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