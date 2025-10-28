import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Grid, Layers, Server, Plus } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";

export default function CICDMatrix() {
  const [activeTab, setActiveTab] = useState("environments");

  return (
    <>
      <SEO 
        title="Vitana DEV — Environment Matrix" 
        description="Environment matrix and multi-environment testing"
        canonical={window.location.href}
      />

      <SubNavigation items={devCICDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Environment Matrix"
            description="Environment matrix and multi-environment testing"
            emoji="🔲"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search environments…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Environment
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="environments">Environment Configs</SplitBarTrigger>
              <SplitBarTrigger value="results">Matrix Results</SplitBarTrigger>
              <SplitBarTrigger value="parallel">Parallel Execution</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="environments" className="mt-6">
              <DevEmptyState 
                title="Environment Configurations" 
                description="View and manage environment matrix configurations."
                icon={Grid}
              />
            </SplitBarContent>

            <SplitBarContent value="results" className="mt-6">
              <DevEmptyState 
                title="Matrix Results" 
                description="Review test results across different environments."
                icon={Layers}
              />
            </SplitBarContent>

            <SplitBarContent value="parallel" className="mt-6">
              <DevEmptyState 
                title="Parallel Execution" 
                description="Monitor parallel execution across multiple environments."
                icon={Server}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
