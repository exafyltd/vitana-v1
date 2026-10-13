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
import { TestTube, CheckSquare, BarChart, Play } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function AgentsQATest() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("suites");

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="QA & Test Agents"
            description="Automated test results and QA reports"
            emoji="🧪"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search tests…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Play className="w-4 h-4 me-2" />
              Run Tests
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="suites">Test Suites</SplitBarTrigger>
              <SplitBarTrigger value="results">Test Results</SplitBarTrigger>
              <SplitBarTrigger value="coverage">Coverage Reports</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="suites" className="mt-6">
              <DevEmptyState 
                title="Test Suites" 
                description="Browse available test suites and their configurations."
                icon={TestTube}
              />
            </SplitBarContent>

            <SplitBarContent value="results" className="mt-6">
              <DevEmptyState 
                title="Test Results" 
                description="View test execution results with pass/fail status and logs."
                icon={CheckSquare}
              />
            </SplitBarContent>

            <SplitBarContent value="coverage" className="mt-6">
              <DevEmptyState 
                title="Coverage Reports" 
                description="Analyze code coverage reports and test coverage metrics."
                icon={BarChart}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — QA & Test Agents" 
        description="Automated test results and QA reports"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

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
