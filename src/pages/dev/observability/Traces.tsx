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
import { Eye, GitBranch, Activity, Filter } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function ObservabilityTraces() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("viewer");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Distributed Traces"
            description="Distributed tracing and trace viewer"
            emoji="🔍"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search traces…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Filter className="w-4 h-4 me-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="viewer">Trace Viewer</SplitBarTrigger>
              <SplitBarTrigger value="search">Trace Search</SplitBarTrigger>
              <SplitBarTrigger value="latency">Latency Analysis</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="viewer" className="mt-6">
              <DevEmptyState 
                title="Trace Viewer" 
                description="Visualize distributed traces across services and components."
                icon={Eye}
              />
            </SplitBarContent>

            <SplitBarContent value="search" className="mt-6">
              <DevEmptyState 
                title="Trace Search" 
                description="Search traces by ID, service, duration, or status."
                icon={GitBranch}
              />
            </SplitBarContent>

            <SplitBarContent value="latency" className="mt-6">
              <DevEmptyState 
                title="Latency Analysis" 
                description="Analyze trace latency and identify performance bottlenecks."
                icon={Activity}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Distributed Traces" 
        description="Distributed tracing and trace viewer"
        canonical={window.location.href}
      />

      <SubNavigation items={devObservabilityNavigation} />

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
