import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { LifestylePlanCard } from "@/components/crossover/LifestylePlanCard";
import { QuickLogStrip } from "@/components/crossover/QuickLogStrip";
import { SmartCalendarCard } from "@/components/crossover/SmartCalendarCard";
import { CommunityPulseCard } from "@/components/crossover/CommunityPulseCard";
import { ProgressStreaksCard } from "@/components/crossover/ProgressStreaksCard";
import { DataWalletCard } from "@/components/crossover/DataWalletCard";
import { DiscoverPicksCard } from "@/components/crossover/DiscoverPicksCard";
import { MotivationCard } from "@/components/crossover/MotivationCard";
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
      
      <main className="flex-1 p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Your personalized wellness overview and actionable insights</p>
        </div>

        {/* TETRIS-style Dynamic Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Row 1: Large Vitana Index + AutoPilot + Smart Calendar */}
          <div className="lg:col-span-2">
            <VitanaIndexCard />
          </div>
          
          <div className="lg:col-span-1">
            <AutoPilotActionCard />
          </div>
          
          <div className="lg:col-span-1">
            <SmartCalendarCard />
          </div>
          
          {/* Row 2: 5 Health Pillar Cards - varying sizes */}
          <div className="md:col-span-1">
            <LifestylePlanCard type="nutrition" />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="hydration" />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="exercise" />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="sleep" />
          </div>

          <div className="md:col-span-1">
            <LifestylePlanCard type="mental" />
          </div>
          
          {/* Row 3: Community Pulse + Progress Streaks + Data Wallet */}
          <div className="lg:col-span-1">
            <CommunityPulseCard />
          </div>
          
          <div className="lg:col-span-1">
            <ProgressStreaksCard />
          </div>
          
          <div className="lg:col-span-2">
            <DataWalletCard />
          </div>
          
          {/* Row 4: Quick Log Strip + Discover Picks + Motivation */}
          <div className="lg:col-span-2">
            <QuickLogStrip />
          </div>
          
          <div className="lg:col-span-1">
            <DiscoverPicksCard />
          </div>
          
          <div className="lg:col-span-1">
            <MotivationCard />
          </div>
        </div>
      </main>
    </AppLayout>
  );
}