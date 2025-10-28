import { useState } from "react";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { devDashboardNavigation } from "@/config/dev-navigation";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { Heart, Activity, CheckCircle, Plus } from "lucide-react";

export default function DashboardSystemHealth() {
  const [activeTab, setActiveTab] = useState("metrics");

  return (
    <>
      <SEO 
        title="VITANA DEV — System Health" 
        description="Monitor overall system health and performance indicators"
        canonical={window.location.href}
      />
      
      <SubNavigation items={devDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="System Health Metrics"
            description="Monitor overall system health and performance indicators"
            emoji="💚"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search health metrics…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="metrics">Health Metrics</SplitBarTrigger>
              <SplitBarTrigger value="components">Component Status</SplitBarTrigger>
              <SplitBarTrigger value="uptime">Uptime Monitor</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEmptyState 
                title="Health Metrics Dashboard" 
                description="View key system health metrics and performance indicators."
                icon={Heart}
              />
            </SplitBarContent>

            <SplitBarContent value="components" className="mt-6">
              <DevEmptyState 
                title="Component Status" 
                description="Monitor the health status of individual system components."
                icon={CheckCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="uptime" className="mt-6">
              <DevEmptyState 
                title="Uptime Monitoring" 
                description="Track system uptime and availability metrics over time."
                icon={Activity}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
