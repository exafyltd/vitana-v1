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
import { Brain, Cpu, Shield, TestTube, Users, Plus } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";

export default function DevAgents() {
  const [activeTab, setActiveTab] = useState("planner");

  return (
    <>
      <SEO 
        title="Vitana DEV — Agents" 
        description="Agent orchestration dashboard for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="Agent Orchestration"
            description="Manage AI agents and their coordination workflows"
            emoji="🤖"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search agents…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="planner">Planner</SplitBarTrigger>
              <SplitBarTrigger value="worker">Worker</SplitBarTrigger>
              <SplitBarTrigger value="validator">Validator</SplitBarTrigger>
              <SplitBarTrigger value="qa">QA/Test</SplitBarTrigger>
              <SplitBarTrigger value="crew">Crew Template</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="planner" className="mt-6">
              <DevEmptyState 
                title="Planning Agent" 
                description="Monitor the planning agent's task decomposition and strategy."
                icon={Brain}
              />
            </SplitBarContent>

            <SplitBarContent value="worker" className="mt-6">
              <DevEmptyState 
                title="Worker Agent Pool" 
                description="View active workers and their current task assignments."
                icon={Cpu}
              />
            </SplitBarContent>

            <SplitBarContent value="validator" className="mt-6">
              <DevEmptyState 
                title="Validation Agent" 
                description="Review validation logs and quality checks."
                icon={Shield}
              />
            </SplitBarContent>

            <SplitBarContent value="qa" className="mt-6">
              <DevEmptyState 
                title="QA Agent" 
                description="View automated test results and QA agent reports."
                icon={TestTube}
              />
            </SplitBarContent>

            <SplitBarContent value="crew" className="mt-6">
              <DevEmptyState 
                title="Agent Crew Templates" 
                description="Manage and configure agent crew templates for orchestration."
                icon={Users}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
