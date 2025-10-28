import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Activity, Database, BookOpen, Shield, Plus } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";

export default function DevOasis() {
  const [activeTab, setActiveTab] = useState("events");

  return (
    <>
      <SEO 
        title="Vitana DEV — OASIS" 
        description="OASIS event sourcing system for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devOasisNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="OASIS Event Sourcing"
            description="Event-driven architecture and state management system"
            emoji="🏛️"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search events…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="events">Events</SplitBarTrigger>
              <SplitBarTrigger value="state">State</SplitBarTrigger>
              <SplitBarTrigger value="ledger">Ledger</SplitBarTrigger>
              <SplitBarTrigger value="policies">Policies</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="events" className="mt-6">
              <DevEmptyState 
                title="Event Stream" 
                description="Monitor real-time event streams in the OASIS system."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="state" className="mt-6">
              <DevEmptyState 
                title="State Snapshots" 
                description="View current state snapshots and projections."
                icon={Database}
              />
            </SplitBarContent>

            <SplitBarContent value="ledger" className="mt-6">
              <DevEmptyState 
                title="Immutable Ledger" 
                description="Browse the immutable event ledger and audit trail."
                icon={BookOpen}
              />
            </SplitBarContent>

            <SplitBarContent value="policies" className="mt-6">
              <DevEmptyState 
                title="Event Policies" 
                description="Configure event handling policies and rules."
                icon={Shield}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
