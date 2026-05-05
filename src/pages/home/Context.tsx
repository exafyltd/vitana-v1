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
import { usePersonalizedMedia } from "@/hooks/usePersonalizedMedia";
import { MusicListCard } from "@/components/home/MusicListCard";

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
import { t } from '@/lib/i18n-toast';

export default function Context() {
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  const [contextPopupOpen, setContextPopupOpen] = useState(false);

  // Context-based media queries
  const hour = new Date().getHours();
  const timeContextTags = 
    hour < 12 ? ['Morning', 'Energetic', 'Wake Up'] :
    hour < 17 ? ['Focus', 'Productivity', 'Concentration'] :
    ['Evening', 'Relaxing', 'Sleep', 'Meditation'];

  // Current tab - Featured music
  const { data: contextualMusic, isLoading: musicLoading } = usePersonalizedMedia({
    limit: 4,
    mediaType: 'Music',
    contextTags: timeContextTags
  });


  // AI Logic tab - AI recommended music
  const { data: aiRecommendedMedia } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music',
    contextTags: ['Educational', 'Wellness', 'Self-Improvement']
  });

  // Timeline tab - Time-appropriate music
  const { data: timelineMedia } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music',
    contextTags: timeContextTags
  });

  // Environment tab - Ambient & nature music
  const { data: environmentMedia } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music',
    contextTags: ['Nature', 'Ambient', 'Outdoor', 'Environment']
  });

  // Social tab - Community favorite music
  const { data: communityMedia } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music',
    contextTags: ['Popular', 'Community', 'Trending']
  });

  return (
    <AppLayout>
      <SEO title={t('screens.home.contextDashboard')} description="Now & Context Snapshot" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-pink-950/20 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.home.nowContextSnapshot')}
            description="Transparency: Why Autopilot makes these choices."
            emoji="🌍"
          />

          {/* Action Buttons */}
          <UtilityActionButton className="mb-6">
            <ExpandableSearchButton 
              placeholder={t('screens.home.searchContextDataCardsInsights')}
              onSearch={(query) => console.log("Search:", query)}
            />
            <UniversalCalendarButton />
            <Button variant="default" size="sm" onClick={() => setContextPopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Context
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation */}
          <SplitBar defaultValue="current" className="w-full">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="current">{t('screens.home.current')}</SplitBarTrigger>
              <SplitBarTrigger value="reasoning">{t('screens.home.aiLogic')}</SplitBarTrigger>
              <SplitBarTrigger value="timeline">{t('screens.home.timeline')}</SplitBarTrigger>
              <SplitBarTrigger value="environment">{t('screens.home.environment')}</SplitBarTrigger>
              <SplitBarTrigger value="social">{t('screens.home.social')}</SplitBarTrigger>
            </SplitBarList>

            {/* Current Tab */}
            <SplitBarContent value="current">
              <div className="mt-6">
                {/* Row 1: Current Vibe & Music */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-3">
                    <MyCurrentVibeCard className="h-full" />
                  </div>
                  <div className="col-span-6">
                    <MusicListCard 
                      tracks={contextualMusic || []}
                      title={hour < 12 ? "Morning Energy" : hour < 17 ? "Focus Sounds" : "Evening Relaxation"}
                      className="h-full"
                    />
                  </div>
                  <div className="col-span-3">
                    <BiometricContextVisualCard className="h-full" />
                  </div>
                </div>

                {/* Row 2: Motivation Banner (full width) */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '140px' }}>
                  <div className="col-span-12">
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

                {/* Row 2: AI-Recommended Music */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-12">
                    <MusicListCard 
                      tracks={aiRecommendedMedia || []}
                      title={t('screens.home.aiRecommendedForYourGoals')}
                      className="h-full"
                    />
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

                {/* Row 2: Time-Based Soundtrack */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-12">
                    <MusicListCard 
                      tracks={timelineMedia || []}
                      title={hour < 12 ? "Your Morning Soundtrack" : hour < 17 ? "Focus & Flow" : "Evening Relaxation"}
                      className="h-full"
                    />
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

                {/* Row 2: Ambient Soundscapes */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-12">
                    <MusicListCard 
                      tracks={environmentMedia || []}
                      title={t('screens.home.natureAmbientSounds')}
                      className="h-full"
                    />
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

                {/* Row 2: What the Community is Listening To */}
                <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                  <div className="col-span-12">
                    <MusicListCard 
                      tracks={communityMedia || []}
                      title={t('screens.home.trendingYourCommunity')}
                      className="h-full"
                    />
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