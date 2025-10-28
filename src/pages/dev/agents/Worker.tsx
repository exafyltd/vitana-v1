import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Cpu, Activity, ListChecks, Plus } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";

export default function AgentsWorker() {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <>
      <SEO 
        title="Vitana DEV — Worker Agents" 
        description="Active worker agents and task assignments"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Worker Agents"
            description="Active worker agents and task assignments"
            emoji="🤖"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search workers…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Worker
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="active">Active Workers</SplitBarTrigger>
              <SplitBarTrigger value="queue">Task Queue</SplitBarTrigger>
              <SplitBarTrigger value="status">Worker Status</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="active" className="mt-6">
              <DevEmptyState 
                title="Active Workers" 
                description="View all currently active worker agents and their assigned tasks."
                icon={Cpu}
              />
            </SplitBarContent>

            <SplitBarContent value="queue" className="mt-6">
              <DevEmptyState 
                title="Task Queue" 
                description="Monitor the task queue and pending work assignments."
                icon={Activity}
              />
            </SplitBarContent>

            <SplitBarContent value="status" className="mt-6">
              <DevEmptyState 
                title="Worker Status" 
                description="Check the health and performance status of all worker agents."
                icon={ListChecks}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
