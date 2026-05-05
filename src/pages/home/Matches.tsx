import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { homeNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { MatchFiltersPopup } from "@/components/MatchFiltersPopup";
import { Plus } from "lucide-react";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";


// Import match-specific cards
import { PeopleMatchCard } from "@/components/crossover/PeopleMatchCard";
import { GroupMatchCard } from "@/components/crossover/GroupMatchCard";
import { EventMatchCard } from "@/components/crossover/EventMatchCard";
import { CompatibilityCard } from "@/components/crossover/CompatibilityCard";
import { CoachCompatibilityHero } from "@/components/coaches/CoachCompatibilityHero";
import { CoachDirectoryGrid } from "@/components/coaches/CoachDirectoryGrid";
import { RelatedCommunityPreview } from "@/components/coaches/RelatedCommunityPreview";
import { AnalysisHero } from "@/components/analysis/AnalysisHero";
import { InsightsSummaryGrid } from "@/components/analysis/InsightsSummaryGrid";
import { ContinueConnectingFeed } from "@/components/analysis/ContinueConnectingFeed";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import { useEffect } from "react";
import { t } from '@/lib/i18n-toast';

export default function Matches() {
  const navigate = useNavigate();
  const [matchFiltersOpen, setMatchFiltersOpen] = useState(false);
  const { insights } = useDemoMatches();
  const { completeBySourceRef } = useAutopilotComplete();
  useEffect(() => { completeBySourceRef('onboarding_discover_matches'); }, [completeBySourceRef]);

  return (
    <AppLayout>
      <SEO title={t('screens.home.matchesDashboard')} description="Matchmaking & Opportunities" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.home.findYourPeople')}
            description="AI-powered connections that feel natural and right for you."
            emoji="💫"
          />

          {/* Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder={t('screens.home.searchPeopleGroupsCoachesEvents')}
              onSearch={(query) => console.log("Search:", query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setMatchFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Matches
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar defaultValue="people" className="w-full mb-6">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="people">
                👥 People
              </SplitBarTrigger>
              <SplitBarTrigger value="groups">
                💬 Groups
              </SplitBarTrigger>
              <SplitBarTrigger value="coaches">
                ✅ Coaches
              </SplitBarTrigger>
              <SplitBarTrigger value="events">
                📅 Events
              </SplitBarTrigger>
              <SplitBarTrigger value="compatibility">
                🎯 Analysis
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="people" className="mt-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <PeopleMatchCard />
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <CompatibilityCard />
                </div>
                <div className="col-span-12">
                  <GroupMatchCard />
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="groups" className="mt-6">
              <GroupMatchCard />
            </SplitBarContent>

            <SplitBarContent value="coaches" className="mt-6">
              <div className="space-y-8">
                {/* Tier 1: Hero Match Analysis */}
                <CoachCompatibilityHero 
                  overallScore={insights.compatibility_overall_pct}
                  topFactors={insights.top_factors}
                  sharedInterests={insights.shared_interests}
                />
                
                {/* Tier 2: Coach Directory */}
                <CoachDirectoryGrid />
                
                {/* Tier 3: Related Community */}
                <RelatedCommunityPreview />
              </div>
            </SplitBarContent>

            <SplitBarContent value="events" className="mt-6">
              <EventMatchCard />
            </SplitBarContent>

        <SplitBarContent value="compatibility" className="mt-6">
          <div className="space-y-8">
            {/* Tier 1: Hero Compatibility Dashboard */}
            <AnalysisHero 
              overallScore={insights.compatibility_overall_pct}
              topFactors={insights.top_factors}
              sharedInterests={insights.shared_interests}
              weekDelta={insights.week_delta_pct}
            />
            
            {/* Tier 2: Insights Summary Grid */}
            <InsightsSummaryGrid />
            
            {/* Tier 3: Continue Connecting Feed */}
            <ContinueConnectingFeed />
          </div>
        </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      {/* Match Filters Popup */}
      <MatchFiltersPopup 
        open={matchFiltersOpen} 
        onOpenChange={setMatchFiltersOpen}
      />
    </AppLayout>
  );
}