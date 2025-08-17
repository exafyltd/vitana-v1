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
import { PodcastCard } from "@/components/crossover/PodcastCard";
import { MusicCard } from "@/components/crossover/MusicCard";
import { VideoFeedCard } from "@/components/crossover/VideoFeedCard";
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
          {/* Header Bar - Consistent with Health & Health Tracker */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Hi Jovana, let´s make today a very special day! ✨</h1>
                <p className="text-muted-foreground">Your wellness journey starts with today's opportunities and endless possibilities.</p>
              </div>
              {/* Vitana Index Circle - Same as Health & Health Tracker */}
              <div 
                className="cursor-pointer group flex-shrink-0 mr-16"
                onClick={() => navigate('/health-tracker/vitana-index')}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

        {/* TETRIS-style Dynamic Grid Layout with Media Cards Mixed In */}
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
          
          {/* Row 2: Health Pillars mixed with Media Cards */}
          <div className="md:col-span-1">
            <LifestylePlanCard type="nutrition" />
          </div>
          
          <div className="md:col-span-1">
            <PodcastCard />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="hydration" />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="exercise" />
          </div>

          <div className="md:col-span-1">
            <MusicCard />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="sleep" />
          </div>
          
          <div className="md:col-span-1">
            <LifestylePlanCard type="mental" />
          </div>
          
          <div className="md:col-span-1">
            <VideoFeedCard />
          </div>
          
          {/* Row 3: Community + Progress + Data Wallet */}
          <div className="lg:col-span-1">
            <CommunityPulseCard />
          </div>
          
          <div className="lg:col-span-1">
            <ProgressStreaksCard />
          </div>
          
          <div className="lg:col-span-2">
            <DataWalletCard />
          </div>
          
          {/* Row 4: Quick Log Strip + Discover + Motivation */}
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

        </div>
      </div>
    </AppLayout>
  );
}