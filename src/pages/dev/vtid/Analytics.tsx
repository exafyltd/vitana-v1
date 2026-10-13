import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { BarChart, TrendingUp, PieChart, Download } from "lucide-react";
import { devVTIDNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function VTIDAnalytics() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("usage");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="VTID Analytics"
            description="VTID usage statistics and analytics"
            emoji="📊"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search metrics…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Download className="w-4 h-4 me-2" />
              Export Report
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="usage">Usage Metrics</SplitBarTrigger>
              <SplitBarTrigger value="distribution">Distribution Charts</SplitBarTrigger>
              <SplitBarTrigger value="trends">Trend Analysis</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="usage" className="mt-6">
              <DevEmptyState 
                title="Usage Metrics" 
                description="Monitor VTID usage statistics and activity metrics."
                icon={BarChart}
              />
            </SplitBarContent>

            <SplitBarContent value="distribution" className="mt-6">
              <DevEmptyState 
                title="Distribution Charts" 
                description="Visualize VTID distribution across tenants and categories."
                icon={PieChart}
              />
            </SplitBarContent>

            <SplitBarContent value="trends" className="mt-6">
              <DevEmptyState 
                title="Trend Analysis" 
                description="Analyze VTID usage trends over time and growth patterns."
                icon={TrendingUp}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — VTID Analytics" 
        description="VTID usage statistics and analytics"
        canonical={window.location.href}
      />

      <SubNavigation items={devVTIDNavigation} />

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
