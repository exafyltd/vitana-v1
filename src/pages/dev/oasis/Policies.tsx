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
import { Shield, FileCheck, Lock, Plus } from "lucide-react";
import { devOasisNavigation } from "@/config/dev-navigation";

export default function OasisPolicies() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <>
      <SEO 
        title="Vitana DEV — OASIS Policies" 
        description="OASIS policies and rules engine"
        canonical={window.location.href}
      />

      <SubNavigation items={devOasisNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="OASIS Policies"
            description="OASIS policies and rules engine (read-only in Phase 1)"
            emoji="🛡️"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search policies…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Policy
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="list">Policy List</SplitBarTrigger>
              <SplitBarTrigger value="editor">Policy Editor</SplitBarTrigger>
              <SplitBarTrigger value="logs">Evaluation Logs</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="list" className="mt-6">
              <DevEmptyState 
                title="Policy List" 
                description="Browse all OASIS policies and their configurations."
                icon={Shield}
              />
            </SplitBarContent>

            <SplitBarContent value="editor" className="mt-6">
              <DevEmptyState 
                title="Policy Editor" 
                description="Edit OASIS policies (disabled in read-only mode)."
                icon={FileCheck}
              />
            </SplitBarContent>

            <SplitBarContent value="logs" className="mt-6">
              <DevEmptyState 
                title="Evaluation Logs" 
                description="View policy evaluation logs and decision records."
                icon={Lock}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
