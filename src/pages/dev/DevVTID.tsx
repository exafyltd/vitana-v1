import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { VTIDSnapshotPanel } from "@/components/dev/VTIDSnapshotPanel";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, BarChart3, Search } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";

export default function DevVTID() {
  const [activeTab, setActiveTab] = useState("registry");

  return (
    <>
      <SEO 
        title="Vitana DEV — VTID" 
        description="VTID management for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devVTIDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="VTID Management"
            description="Manage Vitana Token IDs and ledger operations"
            emoji="🔖"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search VTIDs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Issue VTID
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="registry">Registry</SplitBarTrigger>
              <SplitBarTrigger value="issue">Issue</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Analytics</SplitBarTrigger>
              <SplitBarTrigger value="search">Search</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="registry" className="mt-6">
              <VTIDSnapshotPanel />
            </SplitBarContent>

            <SplitBarContent value="issue" className="mt-6">
              <DevEmptyState 
                title="Issue VTID" 
                description="Create and issue new VTIDs for the platform."
                icon={Plus}
              />
            </SplitBarContent>

            <SplitBarContent value="analytics" className="mt-6">
              <DevEmptyState 
                title="VTID Analytics" 
                description="View VTID usage statistics and trends."
                icon={BarChart3}
              />
            </SplitBarContent>

            <SplitBarContent value="search" className="mt-6">
              <DevEmptyState 
                title="VTID Search" 
                description="Search and filter VTIDs across the platform."
                icon={Search}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
