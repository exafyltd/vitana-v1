import { useState } from "react";
import { useSessionAutosave } from "@/hooks/dev/useSessionAutosave";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { FileText, GitBranch, BarChart, DollarSign, Plus } from "lucide-react";
import { devObservabilityNavigation } from "@/config/dev-navigation";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";

export default function DevObservability() {
  const [activeTab, setActiveTab] = useState("logs");
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  // Autosave session
  useSessionAutosave({
    tab: "Observability",
    subtab: activeTab === "logs" ? "Logs" : 
            activeTab === "traces" ? "Traces" : 
            activeTab === "metrics" ? "Metrics" : "Costs",
  });

  return (
    <>
      <SEO 
        title="Vitana DEV — Observability" 
        description="Observability and monitoring for Vitana platform"
        canonical={window.location.href}
      />

      {/* Horizontal Navigation */}
      <SubNavigation items={devObservabilityNavigation} />

      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title="Observability"
            description="Monitor logs, traces, metrics, and costs across the platform"
            emoji="📊"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search logs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
            <RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />
          </UtilityActionButton>

          {/* Split-Screen Navigation Bar */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="logs">📝 Logs</SplitBarTrigger>
              <SplitBarTrigger value="traces">🔍 Traces</SplitBarTrigger>
              <SplitBarTrigger value="metrics">📈 Metrics</SplitBarTrigger>
              <SplitBarTrigger value="costs">💰 Costs</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="logs" className="mt-6">
              <DevEmptyState 
                title="Aggregated Logs" 
                description="View and search system logs across all services."
                icon={FileText}
              />
            </SplitBarContent>

            <SplitBarContent value="traces" className="mt-6">
              <DevEmptyState 
                title="Distributed Traces" 
                description="Analyze distributed request traces."
                icon={GitBranch}
              />
            </SplitBarContent>

            <SplitBarContent value="metrics" className="mt-6">
              <DevEmptyState 
                title="System Metrics" 
                description="Monitor performance metrics and system health."
                icon={BarChart}
              />
            </SplitBarContent>

            <SplitBarContent value="costs" className="mt-6">
              <DevEmptyState 
                title="Cost Breakdown" 
                description="View resource costs by tenant and service."
                icon={DollarSign}
              />
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
