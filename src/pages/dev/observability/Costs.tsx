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
import { DollarSign, TrendingUp, PieChart, Download } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";

export default function ObservabilityCosts() {
  const [activeTab, setActiveTab] = useState("breakdown");

  return (
    <>
      <SEO 
        title="Vitana DEV — Cost Tracking" 
        description="Cost tracking and resource usage"
        canonical={window.location.href}
      />

      <SubNavigation items={devObservabilityNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Cost Tracking"
            description="Cost tracking and resource usage"
            emoji="💰"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search costs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="breakdown">Cost Breakdown</SplitBarTrigger>
              <SplitBarTrigger value="trends">Cost Trends</SplitBarTrigger>
              <SplitBarTrigger value="budgets">Budget Alerts</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="breakdown" className="mt-6">
              <DevEmptyState 
                title="Cost Breakdown" 
                description="View detailed cost breakdown by service and resource type."
                icon={DollarSign}
              />
            </SplitBarContent>

            <SplitBarContent value="trends" className="mt-6">
              <DevEmptyState 
                title="Cost Trends" 
                description="Analyze cost trends over time and forecast future spending."
                icon={TrendingUp}
              />
            </SplitBarContent>

            <SplitBarContent value="budgets" className="mt-6">
              <DevEmptyState 
                title="Budget Alerts" 
                description="Configure budget alerts and spending thresholds."
                icon={PieChart}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
