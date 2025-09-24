import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import EnrichContextPopup from "@/components/EnrichContextPopup";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { homeNavigation } from "@/config/navigation";

// Context Visual Cards
import { MyCurrentVibeCard } from "@/components/context/MyCurrentVibeCard";
import { BiometricContextVisualCard } from "@/components/context/BiometricContextVisualCard";
import { MotivationBannerCard } from "@/components/context/MotivationBannerCard";
import { AISpotlightCard } from "@/components/context/AISpotlightCard";
import { TodaysPlanCard } from "@/components/context/TodaysPlanCard";
import { EnvironmentCard } from "@/components/context/EnvironmentCard";
import { SocialCard } from "@/components/context/SocialCard";
import { 
  HydrationReminderCard, 
  MorningRoutineCard, 
  UpcomingEventCard, 
  SleepCheckCard,
  CommunitySpotlightCard,
  EnergyPeakCard,
  MeditationSuggestionCard,
  SleepReadinessCard 
} from "@/components/context/QuickActionCards";
import { MotivationalBanner } from "@/components/MotivationalBanner";

export default function Context() {
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  const [contextPopupOpen, setContextPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Context | Dashboard" description="Now & Context Snapshot" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-pink-950/20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Now & Context Snapshot"
            description="Transparency: Why Autopilot makes these choices."
            emoji="🌍"
          />

          {/* Action Buttons */}
          <UtilityActionButton className="mb-6">
            <UniversalCalendarButton />
            <ExpandableSearchButton 
              placeholder="Search context data, cards, or insights…"
              onSearch={(query) => console.log("Search:", query)}
            />
            <Button variant="default" size="sm" onClick={() => setContextPopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Context
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation */}
          <SplitBar defaultValue="current" className="w-full">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="current">Current</SplitBarTrigger>
              <SplitBarTrigger value="reasoning">AI Logic</SplitBarTrigger>
              <SplitBarTrigger value="timeline">Timeline</SplitBarTrigger>
              <SplitBarTrigger value="environment">Environment</SplitBarTrigger>
              <SplitBarTrigger value="social">Social</SplitBarTrigger>
            </SplitBarList>

            {/* Current Status Tab */}
            <SplitBarContent value="current">
              <div className="mt-6">
                {/* Row 1: Current Snapshot (1 big + 2 small) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-6">
                    <MyCurrentVibeCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <BiometricContextVisualCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <MotivationBannerCard className="h-full" />
                  </div>
                </div>
              </div>
            </SplitBarContent>

            {/* AI Logic Tab */}
            <SplitBarContent value="reasoning">
              <div className="mt-6">
                {/* Row 1: AI Logic Insights (2 small + 1 big) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-3">
                    <HydrationReminderCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <MorningRoutineCard className="h-full" />
                  </div>
                  <div className="col-span-6">
                    <AISpotlightCard className="h-full" />
                  </div>
                </div>
              </div>
            </SplitBarContent>

            {/* Timeline Tab */}
            <SplitBarContent value="timeline">
              <div className="mt-6">
                {/* Row 1: Timeline Context (1 big + 2 small) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-6">
                    <TodaysPlanCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <UpcomingEventCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <SleepCheckCard className="h-full" />
                  </div>
                </div>
              </div>
            </SplitBarContent>

            {/* Environment Tab */}
            <SplitBarContent value="environment">
              <div className="mt-6">
                {/* Row 1: Environment & Social (2 small + 1 big) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-3">
                    <EnvironmentCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <SocialCard className="h-full" />
                  </div>
                  <div className="col-span-6">
                    <CommunitySpotlightCard className="h-full" />
                  </div>
                </div>
              </div>
            </SplitBarContent>

            {/* Social Tab */}
            <SplitBarContent value="social">
              <div className="mt-6">
                {/* Row 1: Recommendations (1 big + 2 small) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-6">
                    <EnergyPeakCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <MeditationSuggestionCard className="h-full" />
                  </div>
                  <div className="col-span-3">
                    <SleepReadinessCard className="h-full" />
                  </div>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      {/* Context Popup */}
      <EnrichContextPopup 
        open={contextPopupOpen} 
        onOpenChange={setContextPopupOpen}
      />
    </AppLayout>
  );
}