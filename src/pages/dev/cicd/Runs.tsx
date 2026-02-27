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
import { PlayCircle, Activity, Clock, Filter } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";

export default function CICDRuns() {
  const [activeTab, setActiveTab] = useState("history");

  return (
    <>
      <SEO 
        title="Vitana DEV — CI/CD Runs" 
        description="CI/CD workflow runs and execution history"
        canonical={window.location.href}
      />

      <SubNavigation items={devCICDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="CI/CD Runs"
            description="CI/CD workflow runs and execution history"
            emoji="▶️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search runs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="history">Run History</SplitBarTrigger>
              <SplitBarTrigger value="details">Run Details</SplitBarTrigger>
              <SplitBarTrigger value="metrics">Duration Metrics</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Run History" 
                description="View the complete history of CI/CD workflow executions."
                icon={PlayCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="details" className="mt-6">
              <DevEmptyState 
                title="Run Details" 
                description="Inspect detailed run information with logs and step execution."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEmptyState 
                title="Duration Metrics" 
                description="Analyze workflow duration metrics and performance trends."
                icon={Clock}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
