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
import { GitBranch, PlayCircle, Archive, Grid3x3, Plus } from "lucide-react";
import { devCICDNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function DevCICD() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("workflows");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="CI/CD & Deploys"
            description="Continuous integration and deployment automation"
            emoji="⚙️"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search workflows…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 me-2" />
              New Workflow
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="workflows">🔄 Workflows</SplitBarTrigger>
              <SplitBarTrigger value="runs">▶️ Runs</SplitBarTrigger>
              <SplitBarTrigger value="artifacts">📦 Artifacts</SplitBarTrigger>
              <SplitBarTrigger value="matrix">🌐 Env Matrix</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="workflows" className="mt-6">
              <DevEmptyState 
                title="Workflow Definitions" 
                description="View and manage CI/CD workflow definitions."
                icon={GitBranch}
              />
            </SplitBarContent>

            <SplitBarContent value="runs" className="mt-6">
              <DevEmptyState 
                title="Workflow Runs" 
                description="Monitor workflow execution history and status."
                icon={PlayCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="artifacts" className="mt-6">
              <DevEmptyState 
                title="Build Artifacts" 
                description="Browse and download build artifacts."
                icon={Archive}
              />
            </SplitBarContent>

            <SplitBarContent value="matrix" className="mt-6">
              <DevEmptyState 
                title="Environment Matrix" 
                description="Configure deployment environment matrix."
                icon={Grid3x3}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — CI/CD" 
        description="CI/CD deployment management for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devCICDNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}

      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
