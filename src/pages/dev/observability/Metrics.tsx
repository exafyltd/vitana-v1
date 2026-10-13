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
import { BarChart, TrendingUp, Gauge, Filter } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function ObservabilityMetrics() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("system");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="System Metrics"
            description="System metrics and performance dashboard"
            emoji="📈"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search metrics…"
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
              <SplitBarTrigger value="system">System Metrics</SplitBarTrigger>
              <SplitBarTrigger value="performance">Performance Graphs</SplitBarTrigger>
              <SplitBarTrigger value="alerts">Alerting Rules</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="system" className="mt-6">
              <DevEmptyState 
                title="System Metrics" 
                description="Monitor CPU, memory, disk, and network metrics."
                icon={BarChart}
              />
            </SplitBarContent>

            <SplitBarContent value="performance" className="mt-6">
              <DevEmptyState 
                title="Performance Graphs" 
                description="Visualize system performance trends and anomalies."
                icon={TrendingUp}
              />
            </SplitBarContent>

            <SplitBarContent value="alerts" className="mt-6">
              <DevEmptyState 
                title="Alerting Rules" 
                description="Configure alerting rules and thresholds for metrics."
                icon={Gauge}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — System Metrics" 
        description="System metrics and performance dashboard"
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
