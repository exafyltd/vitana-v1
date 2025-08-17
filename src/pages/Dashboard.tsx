import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { QuickLogStrip } from "@/components/crossover/QuickLogStrip";
import { useNavigate } from "react-router-dom";


const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];


export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Hi Jovana, let´s make today a very special day! ✨</h1>
            <p className="text-muted-foreground">Your wellness journey starts with today's opportunities and endless possibilities.</p>
          </div>

          {/* Top Row - Vitana Index and AutoPilot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <VitanaIndexCard />
            <AutoPilotActionCard />
          </div>

          {/* Lifestyle Plans Grid - 5 Plan Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <LifestylePlanCard type="nutrition" />
            <LifestylePlanCard type="hydration" />
            <LifestylePlanCard type="exercise" />
            <LifestylePlanCard type="sleep" />
            <LifestylePlanCard type="screen" />
          </div>

          {/* Quick Log Strip */}
          <QuickLogStrip className="mb-8" />

        </div>
      </div>
    </AppLayout>
  );
}
