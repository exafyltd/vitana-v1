import { useState } from "react";
import { Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MatchFiltersPopup } from "@/components/MatchFiltersPopup";
import { MatchNotificationBadge } from "@/components/MatchNotificationBadge";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useIsMobile } from "@/hooks/use-mobile";

// Import match-specific cards
import { PeopleMatchCard } from "@/components/crossover/PeopleMatchCard";
import { GroupMatchCard } from "@/components/crossover/GroupMatchCard";
import { CoachMatchCard } from "@/components/crossover/CoachMatchCard";
import { EventMatchCard } from "@/components/crossover/EventMatchCard";
import { CompatibilityCard } from "@/components/crossover/CompatibilityCard";

import { communityNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function Matchmaking() {
  const [matchFiltersOpen, setMatchFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("people");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();

  return (
    <AppLayout>
      <SEO title={t('screens.community.matchmakingCommunity')} description="Find compatible community members" canonical={window.location.href} />
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <StandardHeader 
              title={t('screens.community.perfectMatchesForYourJourney')}
              description="Discover compatible community members based on your interests and wellness goals."
              emoji="💫"
            />
            <MatchNotificationBadge />
          </div>

          {/* Utility Action Button - Unified Mobile Pattern */}
          <UtilityActionButton className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-max">
              <ExpandableSearchButton 
                placeholder={t('screens.community.searchMatches')}
                onSearch={(query) => console.log('Search Matches:', query)}
              />
              <UniversalCalendarButton />
              
              {/* Filters - PRIMARY ACTION */}
              <Button 
                size="sm" 
                onClick={() => setMatchFiltersOpen(true)}
                className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && <span>Filters</span>}
              </Button>
              
              {/* Vitana Index chip (mobile only) */}
              {isMobile && <VitanaIndexChip />}
              
              {/* Autopilot chip (mobile only) */}
              {isMobile && (
                <AutopilotChip 
                  pendingCount={pendingCount} 
                  onClick={() => setAutopilotOpen(true)} 
                />
              )}
            </div>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="people">{t('screens.community.people')}</SplitBarTrigger>
              <SplitBarTrigger value="groups">{t('screens.community.groups')}</SplitBarTrigger>
              <SplitBarTrigger value="coaches">{t('screens.community.coaches')}</SplitBarTrigger>
              <SplitBarTrigger value="events">{t('screens.community.events')}</SplitBarTrigger>
              <SplitBarTrigger value="analysis">{t('screens.community.analysis')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="people" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <PeopleMatchCard />
                <CompatibilityCard />
                <GroupMatchCard />
              </div>
            </SplitBarContent>

            <SplitBarContent value="groups" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <GroupMatchCard />
                <EventMatchCard />
                <PeopleMatchCard />
              </div>
            </SplitBarContent>

            <SplitBarContent value="coaches" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CoachMatchCard />
                <CompatibilityCard />
                <GroupMatchCard />
              </div>
            </SplitBarContent>

            <SplitBarContent value="events" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <EventMatchCard />
                <PeopleMatchCard />
                <CoachMatchCard />
              </div>
            </SplitBarContent>

            <SplitBarContent value="analysis" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CompatibilityCard />
                <PeopleMatchCard />
                <GroupMatchCard />
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
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}