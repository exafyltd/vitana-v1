import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Database, Eye, Layers, Download } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function OasisState() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("snapshots");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="OASIS State"
            description="OASIS state snapshots and current state management"
            emoji="💾"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search state…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Download className="w-4 h-4 me-2" />
              Export Snapshot
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="snapshots">State Snapshots</SplitBarTrigger>
              <SplitBarTrigger value="diff">State Diff Viewer</SplitBarTrigger>
              <SplitBarTrigger value="history">State History</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="snapshots" className="mt-6">
              <DevEmptyState 
                title="State Snapshots" 
                description="View OASIS state snapshots at specific points in time."
                icon={Database}
              />
            </SplitBarContent>

            <SplitBarContent value="diff" className="mt-6">
              <DevEmptyState 
                title="State Diff Viewer" 
                description="Compare state changes between different snapshots."
                icon={Eye}
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="State History" 
                description="Browse the complete history of OASIS state changes."
                icon={Layers}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — OASIS State" 
        description="OASIS state snapshots and current state management"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}
    </>
  );
}
