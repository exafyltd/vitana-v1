import { useState } from "react";
import { useSessionAutosave } from "@/hooks/dev/useSessionAutosave";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { ExecutionLogsList } from "@/components/dev/ExecutionLogsList";
import { TimelineView } from "@/components/dev/TimelineView";
import { FilteredView } from "@/components/dev/FilteredView";
import { ExportLogsModal } from "@/components/dev/modals/ExportLogsModal";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

export default function CommandHistory() {
  const spotlight = useSpotlightEnabled();
  const [activeTab, setActiveTab] = useState("logs");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  // Autosave session
  useSessionAutosave({
    tab: "History",
    subtab: activeTab === "logs" ? "Execution Logs" : 
            activeTab === "timeline" ? "Timeline" : "Filtered",
  });

  const devBody = (
    <>
        <div className="max-w-7xl mx-auto space-y-6">
          
          <DevStandardHeader 
            title="Command History"
            description="Browse the history of executed commands and review their outcomes."
            emoji="📜"
          />

          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search history…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setExportModalOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              Export Logs
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList className="w-full mb-6 bg-surface-raised/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="logs">Execution Logs</SplitBarTrigger>
              <SplitBarTrigger value="timeline">Timeline</SplitBarTrigger>
              <SplitBarTrigger value="filtered">Filtered</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="logs" className="mt-6">
              <ExecutionLogsList />
            </SplitBarContent>

            <SplitBarContent value="timeline" className="mt-6">
              <TimelineView />
            </SplitBarContent>

            <SplitBarContent value="filtered" className="mt-6">
              <FilteredView />
            </SplitBarContent>
          </SplitBar>
        </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Vitana DEV — Command History" 
        description="Browse the history of executed commands and their results"
        canonical={window.location.href}
      />

      <SubNavigation items={devCommandNavigation} />

      {spotlight ? (
        <ScreenFrame archetype="workspace">
          {devBody}
        </ScreenFrame>
      ) : (
        <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to dark:from-background dark:via-background dark:to-background min-h-screen">{devBody}</div>
      )}

      {/* Export Modal */}
      <ExportLogsModal 
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen}
      />
      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
