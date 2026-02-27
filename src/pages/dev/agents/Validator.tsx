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
import { Shield, CheckCircle, FileCheck, Filter } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";

export default function AgentsValidator() {
  const [activeTab, setActiveTab] = useState("results");

  return (
    <>
      <SEO 
        title="Vitana DEV — Validator Agents" 
        description="Validation logs and quality checks"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Validator Agents"
            description="Validation logs and quality checks"
            emoji="🛡️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search validations…"
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
              <SplitBarTrigger value="results">Validation Results</SplitBarTrigger>
              <SplitBarTrigger value="metrics">Quality Metrics</SplitBarTrigger>
              <SplitBarTrigger value="errors">Error Logs</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="results" className="mt-6">
              <DevEmptyState 
                title="Validation Results" 
                description="Review validation results from quality checks and automated reviews."
                icon={Shield}
              />
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEmptyState 
                title="Quality Metrics" 
                description="Monitor quality metrics and validation pass/fail rates."
                icon={CheckCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="errors" className="mt-6">
              <DevEmptyState 
                title="Error Logs" 
                description="View detailed error logs from failed validation checks."
                icon={FileCheck}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
