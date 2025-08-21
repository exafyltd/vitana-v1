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

        {/* Pinterest-style Masonry Grid Layout with Media Cards Mixed In */}
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {/* Large cards */}
          <div className="break-inside-avoid mb-4">
            <VitanaIndexCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <AutoPilotActionCard />
          </div>
          
          {/* Quick Health Logging - Positioned after main cards */}
          <div className="break-inside-avoid mb-4">
            <QuickLogStrip />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <SmartCalendarCard />
          </div>
          
          {/* Health Pillars mixed with Media Cards */}
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="nutrition" />
          </div>
          
          {/* Podcast Card - Medium size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto' }}>
            <PodcastCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="hydration" />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="exercise" />
          </div>

          {/* Music Card - Small size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto', minHeight: '200px' }}>
            <MusicCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="sleep" />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <LifestylePlanCard type="mental" />
          </div>
          
          {/* Video Card - Large size */}
          <div className="break-inside-avoid mb-4" style={{ height: 'auto', minHeight: '350px' }}>
            <VideoFeedCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <CommunityPulseCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <ProgressStreaksCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <DataWalletCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <DiscoverPicksCard />
          </div>
          
          <div className="break-inside-avoid mb-4">
            <MotivationCard />
          </div>
        </div>

        </div>
      </div>
    </AppLayout>
  );
}