import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSessionAutosave } from "@/hooks/dev/useSessionAutosave";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevDataTable } from "@/components/dev/DevDataTable";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, Plane, Users, Activity } from "lucide-react";
import { devCommandNavigation } from "@/config/dev-navigation";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { CommandCenterView } from "@/components/dev/CommandCenterView";
import { OpenTasksList } from "@/components/dev/OpenTasksList";
import { TasksView } from "@/components/dev/TasksView";
import { AutopilotRunsView } from "@/components/dev/AutopilotRunsView";
import { CreateCommandModal } from "@/components/dev/modals/CreateCommandModal";
import { CreateTaskModal } from "@/components/dev/modals/CreateTaskModal";
import { TriggerRunModal } from "@/components/dev/modals/TriggerRunModal";
import { RestoreSessionButton } from "@/components/dev/RestoreSessionButton";
import { RestoreSessionModal } from "@/components/dev/modals/RestoreSessionModal";
import { useOasisEvents } from "@/hooks/dev/useOasisEvents";
import { OasisEvent } from "@/lib/devGatewayClient";
import { formatDistanceToNow } from "date-fns";

export default function DevCommand() {
  const location = useLocation();
  const activeTab = location.pathname === "/dev/command" 
    ? "live-console" 
    : location.pathname.split("/").pop() || "live-console";
  
  const [nestedTab, setNestedTab] = useState("command-center");
  const [createCommandOpen, setCreateCommandOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [triggerRunOpen, setTriggerRunOpen] = useState(false);
  const [restoreSessionOpen, setRestoreSessionOpen] = useState(false);

  // Autosave session on tab/subtab changes
  const { saveCurrentSession } = useSessionAutosave({
    tab: activeTab === "live-console" ? "Live Console" : 
         activeTab === "tasks" ? "Tasks" : 
         activeTab === "autopilot-runs" ? "Autopilot Runs" : "History",
    subtab: activeTab === "live-console" ? 
            (nestedTab === "command-center" ? "Command Center" : "Open Tasks") : 
            undefined,
    context: undefined, // Can be enhanced with specific task/run context
  });

  // Save session when modals open/close
  useEffect(() => {
    if (createCommandOpen || createTaskOpen || triggerRunOpen) {
      saveCurrentSession();
    }
  }, [createCommandOpen, createTaskOpen, triggerRunOpen]);

  // History data
  const { events: historyEvents, error: historyError, available: historyAvailable, isLoading: historyLoading, refetch: historyRefetch } = useOasisEvents({ limit: 100 });

  const getButtonLabel = () => {
    switch (activeTab) {
      case "live-console": return "New Command";
      case "tasks": return "New Task";
      case "autopilot-runs": return "New Run";
      default: return "Action";
    }
  };

  const handleActionClick = () => {
    switch (activeTab) {
      case "live-console":
        setCreateCommandOpen(true);
        break;
      case "tasks":
        setCreateTaskOpen(true);
        break;
      case "autopilot-runs":
        setTriggerRunOpen(true);
        break;
    }
  };

  return (
    <>
      <SEO 
        title="Vitana DEV — Command" 
        description="Command execution hub for Vitana platform"
        canonical={window.location.href}
      />

      {/* Main Navigation */}
      <SubNavigation 
        items={devCommandNavigation}
      />

      <div className="p-6 pb-24 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title={
              activeTab === "tasks" 
                ? "Manage and Track System Tasks" 
                : activeTab === "autopilot-runs"
                ? "Monitor Autopilot Executions"
                : "Operate the Vitana System Autonomously"
            }
            description={
              activeTab === "tasks" 
                ? "View, organize, and complete tasks across all agents and autopilot runs." 
                : activeTab === "autopilot-runs"
                ? "View, trigger, and analyze automated workflows and system actions."
                : "Execute commands, manage workflows, and monitor system operations"
            }
            emoji="✨"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton
            trailingElement={<RestoreSessionButton onClick={() => setRestoreSessionOpen(true)} />}
          >
            <ExpandableSearchButton 
              placeholder="Search commands…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={handleActionClick}>
              <Plus className="w-4 h-4 mr-2" />
              {getButtonLabel()}
            </Button>
          </UtilityActionButton>

          {/* Content based on active tab */}
          {activeTab === "live-console" && (
            <SplitBar value={nestedTab} onValueChange={setNestedTab}>
              <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
                <SplitBarTrigger value="command-center">🎮 Command Center</SplitBarTrigger>
                <SplitBarTrigger value="open-tasks">📋 Open Tasks</SplitBarTrigger>
              </SplitBarList>

              <SplitBarContent value="command-center">
                <CommandCenterView />
              </SplitBarContent>

              <SplitBarContent value="open-tasks">
                <OpenTasksList />
              </SplitBarContent>
            </SplitBar>
          )}
          
          {activeTab === "tasks" && (
            <TasksView />
          )}

          {activeTab === "autopilot-runs" && (
            <AutopilotRunsView />
          )}

          {activeTab === "history" && (
            <DevDataTable
              title="Command History"
              description="Past operations and execution logs"
              columns={[
                { key: "created_at", label: "Time", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span> },
                { key: "type", label: "Type", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <Badge variant="outline" className="text-xs">{row.type}</Badge> },
                { key: "service", label: "Service", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <span className="font-medium text-sm">{row.service}</span> },
                { key: "status", label: "Status", sortable: true, render: (row: OasisEvent & Record<string, unknown>) => <Badge className={`text-xs ${row.status === "green" ? "bg-green-100 text-green-800" : row.status === "red" ? "bg-red-100 text-red-800" : row.status === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{row.status}</Badge> },
                { key: "vtid", label: "VTID", render: (row: OasisEvent & Record<string, unknown>) => row.vtid ? <Badge variant="secondary" className="text-xs font-mono">{row.vtid}</Badge> : <span className="text-muted-foreground">—</span> },
                { key: "message", label: "Message", className: "max-w-[300px]", render: (row: OasisEvent & Record<string, unknown>) => <span className="text-sm truncate block">{row.message}</span> },
              ]}
              data={historyEvents.map(e => ({ ...e } as OasisEvent & Record<string, unknown>))}
              isLoading={historyLoading}
              error={historyError}
              available={historyAvailable}
              onRefresh={historyRefetch}
              searchable
              searchPlaceholder="Filter history…"
              searchKeys={["type", "service", "vtid", "message", "status"]}
              emptyMessage="No command history"
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCommandModal 
        open={createCommandOpen} 
        onOpenChange={setCreateCommandOpen}
      />
      <CreateTaskModal 
        open={createTaskOpen} 
        onOpenChange={setCreateTaskOpen}
      />
      <TriggerRunModal 
        open={triggerRunOpen} 
        onOpenChange={setTriggerRunOpen}
      />
      <RestoreSessionModal 
        open={restoreSessionOpen} 
        onOpenChange={setRestoreSessionOpen}
      />
    </>
  );
}
