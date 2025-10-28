import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Gauge, TrendingUp, Activity, Plus } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";

export default function PipelinesCanary() {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <>
      <SEO 
        title="Vitana DEV — Canary Deployments" 
        description="Canary deployments and monitoring"
        canonical={window.location.href}
      />

      <SubNavigation items={devPipelinesNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Canary Deployments"
            description="Canary deployments and monitoring"
            emoji="🐤"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search canaries…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Canary
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="active">Active Canaries</SplitBarTrigger>
              <SplitBarTrigger value="rollout">Rollout Percentage</SplitBarTrigger>
              <SplitBarTrigger value="metrics">Metrics Comparison</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active" className="mt-6">
              <DevEmptyState 
                title="Active Canaries" 
                description="Monitor currently active canary deployments and their status."
                icon={Gauge}
              />
            </SplitBarContent>

            <SplitBarContent value="rollout" className="mt-6">
              <DevEmptyState 
                title="Rollout Percentage" 
                description="Track canary rollout percentage and traffic distribution."
                icon={TrendingUp}
              />
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEmptyState 
                title="Metrics Comparison" 
                description="Compare canary metrics against stable version performance."
                icon={Activity}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
