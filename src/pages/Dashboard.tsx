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

          {/* TETRIS-Style Dynamic Layout */}
          <div className="grid grid-cols-12 gap-4 mb-8">
            {/* Row 1: Large Vitana Index + Medium AutoPilot */}
            <div className="col-span-12 md:col-span-8">
              <VitanaIndexCard className="h-80" />
            </div>
            <div className="col-span-12 md:col-span-4">
              <AutoPilotActionCard className="h-80" />
            </div>
            
            {/* Row 2: 5 Lifestyle Cards - Different Arrangements */}
            <div className="col-span-6 md:col-span-3">
              <LifestylePlanCard type="nutrition" />
            </div>
            <div className="col-span-6 md:col-span-3">
              <LifestylePlanCard type="hydration" />
            </div>
            <div className="col-span-12 md:col-span-6">
              <LifestylePlanCard type="exercise" className="h-72" />
            </div>
            
            {/* Row 3: Sleep and Mental Health */}
            <div className="col-span-6 md:col-span-4">
              <LifestylePlanCard type="sleep" />
            </div>
            <div className="col-span-6 md:col-span-4">
              <LifestylePlanCard type="mental" />
            </div>
            
            {/* Row 4: Quick Log Strip - Full Width */}
            <div className="col-span-12">
              <QuickLogStrip className="h-auto" />
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
