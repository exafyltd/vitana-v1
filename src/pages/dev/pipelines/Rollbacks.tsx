import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Undo, RotateCcw, History, Filter } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";

export default function PipelinesRollbacks() {
  const [activeTab, setActiveTab] = useState("history");

  return (
    <>
      <SEO 
        title="Vitana DEV — Pipeline Rollbacks" 
        description="Rollback history and management"
        canonical={window.location.href}
      />

      <SubNavigation items={devPipelinesNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Pipeline Rollbacks"
            description="Rollback history and management"
            emoji="↩️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search rollbacks…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="history">Rollback History</SplitBarTrigger>
              <SplitBarTrigger value="triggers">Rollback Triggers</SplitBarTrigger>
              <SplitBarTrigger value="impact">Impact Analysis</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Rollback History" 
                description="View the complete history of pipeline rollbacks and their reasons."
                icon={Undo}
              />
            </SplitBarContent>

            <SplitBarContent value="triggers" className="mt-6">
              <DevEmptyState 
                title="Rollback Triggers" 
                description="Review automatic rollback triggers and their configurations."
                icon={RotateCcw}
              />
            </SplitBarContent>

            <SplitBarContent value="impact" className="mt-6">
              <DevEmptyState 
                title="Impact Analysis" 
                description="Analyze the impact of rollbacks on system stability and metrics."
                icon={History}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
