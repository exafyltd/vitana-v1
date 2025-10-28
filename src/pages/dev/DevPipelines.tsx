import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Package, TestTube2, Rocket, Undo2, Plus } from "lucide-react";
import { devPipelinesNavigation } from "@/config/dev-navigation";

export default function DevPipelines() {
  const [activeTab, setActiveTab] = useState("builds");

  return (
    <>
      <SEO 
        title="Vitana DEV — Pipelines" 
        description="CI/CD pipeline monitoring for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devPipelinesNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="Pipeline Conductor"
            description="Orchestrate builds, tests, and deployments across environments"
            emoji="🚀"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search pipelines…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Pipeline
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="builds">Builds</SplitBarTrigger>
              <SplitBarTrigger value="tests">Tests</SplitBarTrigger>
              <SplitBarTrigger value="canary">Canary</SplitBarTrigger>
              <SplitBarTrigger value="rollbacks">Rollbacks</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="builds" className="mt-6">
              <DevEmptyState 
                title="Build History" 
                description="Monitor build pipelines and deployment status."
                icon={Package}
              />
            </SplitBarContent>

            <SplitBarContent value="tests" className="mt-6">
              <DevEmptyState 
                title="Test Runs" 
                description="View automated test execution results and coverage."
                icon={TestTube2}
              />
            </SplitBarContent>

            <SplitBarContent value="canary" className="mt-6">
              <DevEmptyState 
                title="Canary Deployments" 
                description="Track canary deployment status and metrics."
                icon={Rocket}
              />
            </SplitBarContent>

            <SplitBarContent value="rollbacks" className="mt-6">
              <DevEmptyState 
                title="Rollback History" 
                description="Review rollback operations and their outcomes."
                icon={Undo2}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
