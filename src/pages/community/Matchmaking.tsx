import { useState } from "react";
import { Search, Plus } from "lucide-react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MatchFiltersPopup } from "@/components/MatchFiltersPopup";
import { MatchNotificationBadge } from "@/components/MatchNotificationBadge";

// Import match-specific cards
import { PeopleMatchCard } from "@/components/crossover/PeopleMatchCard";
import { GroupMatchCard } from "@/components/crossover/GroupMatchCard";
import { CoachMatchCard } from "@/components/crossover/CoachMatchCard";
import { EventMatchCard } from "@/components/crossover/EventMatchCard";
import { CompatibilityCard } from "@/components/crossover/CompatibilityCard";

import { communityNavigation } from "@/config/navigation";

export default function Matchmaking() {
  const [matchFiltersOpen, setMatchFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("people");

  return (
    <AppLayout>
      <SEO title="Matchmaking | Community" description="Find compatible community members" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <StandardHeader 
              title="Perfect matches for your journey!"
              description="Discover compatible community members based on your interests and wellness goals."
              emoji="💫"
            />
            <MatchNotificationBadge />
          </div>

          {/* Utility Action Button */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search Matches…"
              onSearch={(query) => console.log('Search Matches:', query)}
            />
            <Button size="sm" onClick={() => setMatchFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Matches
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="people">People</SplitBarTrigger>
              <SplitBarTrigger value="groups">Groups</SplitBarTrigger>
              <SplitBarTrigger value="coaches">Coaches</SplitBarTrigger>
              <SplitBarTrigger value="events">Events</SplitBarTrigger>
              <SplitBarTrigger value="analysis">Analysis</SplitBarTrigger>
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
    </AppLayout>
  );
}