import { useState } from "react";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Terminal, CheckCircle, History, FileEdit, Plus } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";

export default function DevCommand() {
  const [activeTab, setActiveTab] = useState("queue");

  return (
    <>
      <SEO 
        title="Vitana DEV — Command" 
        description="Command execution hub for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devCommandNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="Command Hub"
            description="Execute and monitor commands across the platform"
            emoji="⚡"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search commands…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Command
            </Button>
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="queue">Queue</SplitBarTrigger>
              <SplitBarTrigger value="approvals">Approvals</SplitBarTrigger>
              <SplitBarTrigger value="history">History</SplitBarTrigger>
              <SplitBarTrigger value="compose">Compose</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="queue" className="mt-6">
              <DevEmptyState 
                title="Command Queue" 
                description="View and manage pending commands in the execution queue."
                icon={Terminal}
              />
            </SplitBarContent>

            <SplitBarContent value="approvals" className="mt-6">
              <DevEmptyState 
                title="Command Approvals" 
                description="Review and approve commands requiring authorization."
                icon={CheckCircle}
              />
            </SplitBarContent>

            <SplitBarContent value="history" className="mt-6">
              <DevEmptyState 
                title="Command History" 
                description="Browse the history of executed commands and their results."
                icon={History}
              />
            </SplitBarContent>

            <SplitBarContent value="compose" className="mt-6">
              <DevEmptyState 
                title="Command Composer" 
                description="Compose and execute custom commands with syntax highlighting."
                icon={FileEdit}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
    </>
  );
}
