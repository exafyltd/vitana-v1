import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Package, Archive, Download, Filter } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";

export default function CICDArtifacts() {
  const [activeTab, setActiveTab] = useState("registry");

  return (
    <>
      <SEO 
        title="Vitana DEV — Build Artifacts" 
        description="Build artifacts and deployables"
        canonical={window.location.href}
      />

      <SubNavigation items={devCICDNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Build Artifacts"
            description="Build artifacts and deployables"
            emoji="📦"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search artifacts…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="registry">Artifact Registry</SplitBarTrigger>
              <SplitBarTrigger value="downloads">Download Links</SplitBarTrigger>
              <SplitBarTrigger value="metadata">Artifact Metadata</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="registry" className="mt-6">
              <DevEmptyState 
                title="Artifact Registry" 
                description="Browse the registry of build artifacts and deployables."
                icon={Package}
              />
            </SplitBarContent>

            <SplitBarContent value="downloads" className="mt-6">
              <DevEmptyState 
                title="Download Links" 
                description="Access download links for build artifacts and packages."
                icon={Download}
              />
            </SplitBarContent>

            <SplitBarContent value="metadata" className="mt-6">
              <DevEmptyState 
                title="Artifact Metadata" 
                description="View detailed metadata for each build artifact."
                icon={Archive}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
