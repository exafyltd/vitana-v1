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
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState, useEffect } from "react";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { useProfile } from "@/context/ProfileProvider";
import { useMotivationalMessage } from "@/hooks/useMotivationalMessage";
import { Universal3CardHeader } from "@/components/Universal3CardHeader";

import { homeNavigation } from "@/config/navigation";

export default function Home() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { profile } = useProfile();
  
  const firstName = profile?.displayName?.split(' ')[0] || '';
  const { greeting, emoji } = useMotivationalMessage(firstName);

  // Show onboarding for new users (check localStorage for demo)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('vitana-onboarding-completed');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (open: boolean) => {
    if (!open) {
      localStorage.setItem('vitana-onboarding-completed', 'true');
    }
    setShowOnboarding(open);
  };
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Home | VITANA" description="VITANA Home" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <Universal3CardHeader 
        title={greeting}
        description="Your wellness journey starts with today's opportunities."
        emoji={emoji}
        onAutopilotClick={() => setAutopilotOpen(true)}
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">

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
      
      {/* Onboarding Overlay */}
      <OnboardingOverlay 
        open={showOnboarding}
        onOpenChange={handleOnboardingComplete}
      />
    </AppLayout>
  );
}