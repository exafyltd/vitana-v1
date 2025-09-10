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
import { Users, Target, Calendar, UserCheck, Plus } from "lucide-react";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";

// Import match-specific cards
import { PeopleMatchCard } from "@/components/crossover/PeopleMatchCard";
import { GroupMatchCard } from "@/components/crossover/GroupMatchCard";
import { CoachMatchCard } from "@/components/crossover/CoachMatchCard";
import { EventMatchCard } from "@/components/crossover/EventMatchCard";
import { CompatibilityCard } from "@/components/crossover/CompatibilityCard";

export default function Matches() {
  const navigate = useNavigate();
  const [matchFiltersOpen, setMatchFiltersOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title="Matches | Dashboard" description="Matchmaking & Opportunities" canonical={window.location.href} />
      <SubNavigation items={homeNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Matchmaking & Opportunities"
            description="Autopilot as your wingman."
            emoji="🤝"
          />

          {/* Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search people, groups, coaches, events…"
              onSearch={(query) => console.log("Search:", query)}
            />
            <Button size="sm" onClick={() => setMatchFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Matches
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar defaultValue="people" className="w-full mb-6">
            <SplitBarList className="grid w-full grid-cols-5">
              <SplitBarTrigger value="people" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                People
              </SplitBarTrigger>
              <SplitBarTrigger value="groups" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Groups
              </SplitBarTrigger>
              <SplitBarTrigger value="coaches" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Coaches
              </SplitBarTrigger>
              <SplitBarTrigger value="events" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events
              </SplitBarTrigger>
              <SplitBarTrigger value="compatibility" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Analysis
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="people" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <PeopleMatchCard />
                <GroupMatchCard />
                <CompatibilityCard />
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

            <SplitBarContent value="compatibility" className="mt-6">
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