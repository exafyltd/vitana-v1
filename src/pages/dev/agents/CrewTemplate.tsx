import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Users, Layers, Settings, Plus } from "lucide-react";
import { devAgentsNavigation } from "@/config/dev-navigation";

export default function AgentsCrewTemplate() {
  const [activeTab, setActiveTab] = useState("definitions");

  return (
    <>
      <SEO 
        title="Vitana DEV — Crew Templates" 
        description="Agent crew configurations and templates"
        canonical={window.location.href}
      />

      <SubNavigation items={devAgentsNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Crew Templates"
            description="Agent crew configurations and templates"
            emoji="👥"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search templates…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="definitions">Crew Definitions</SplitBarTrigger>
              <SplitBarTrigger value="library">Template Library</SplitBarTrigger>
              <SplitBarTrigger value="analytics">Crew Analytics</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="definitions" className="mt-6">
              <DevEmptyState 
                title="Crew Definitions" 
                description="View and manage agent crew definitions and team compositions."
                icon={Users}
              />
            </SplitBarContent>

            <SplitBarContent value="library" className="mt-6">
              <DevEmptyState 
                title="Template Library" 
                description="Browse pre-configured crew templates for common workflows."
                icon={Layers}
              />
            </SplitBarContent>

            <SplitBarContent value="analytics" className="mt-6">
              <DevEmptyState 
                title="Crew Analytics" 
                description="Analyze crew performance metrics and collaboration patterns."
                icon={Settings}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
