import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { BarChart, TrendingUp, Gauge, Filter } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";

export default function ObservabilityMetrics() {
  const [activeTab, setActiveTab] = useState("system");

  return (
    <>
      <SEO 
        title="Vitana DEV — System Metrics" 
        description="System metrics and performance dashboard"
        canonical={window.location.href}
      />

      <SubNavigation items={devObservabilityNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
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
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
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
      </div>
    </>
  );
}
