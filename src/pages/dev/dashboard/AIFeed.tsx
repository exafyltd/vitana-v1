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
import { Activity, Brain, TrendingUp, Plus } from "lucide-react";

export default function DashboardAIFeed() {
  const [activeTab, setActiveTab] = useState("recent");

  return (
    <>
      <SEO 
        title="VITANA DEV — AI Feed" 
        description="Monitor AI agent activities and insights across the platform"
        canonical={window.location.href}
      />
      
      <SubNavigation items={devDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="AI Activity Feed"
            description="Monitor AI agent activities and insights across the platform"
            emoji="🤖"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search AI activities…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="recent">Recent Activities</SplitBarTrigger>
              <SplitBarTrigger value="agents">By Agent</SplitBarTrigger>
              <SplitBarTrigger value="insights">Insights</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="recent" className="mt-6">
              <DevEmptyState 
                title="Recent AI Activities" 
                description="View recent AI agent actions and decisions in real-time."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="agents" className="mt-6">
              <DevEmptyState 
                title="Activity by Agent" 
                description="Filter and analyze activities by specific AI agents."
                icon={Brain}
              />
            </SplitBarContent>

            <SplitBarContent value="insights" className="mt-6">
              <DevEmptyState 
                title="AI Insights & Patterns" 
                description="Discover patterns and insights from AI activities."
                icon={TrendingUp}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
