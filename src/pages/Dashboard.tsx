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
import { Plane } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const dashboardSubItems = [
  { id: "overview", name: "Overview", path: "/dashboard" },
  { id: "context", name: "Context", path: "/dashboard/context" },
  { id: "actions", name: "Actions", path: "/dashboard/actions" },
  { id: "matches", name: "Matches", path: "/dashboard/matches" },
  { id: "aifeed", name: "AI Feed", path: "/dashboard/aifeed" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SubNavigation items={dashboardSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Hi Jovana, let´s make today a very special day! ✨</h1>
                <p className="text-muted-foreground">Your wellness journey starts with today's opportunities.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
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
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}