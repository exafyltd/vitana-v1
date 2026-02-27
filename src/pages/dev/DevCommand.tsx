import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSessionAutosave } from "@/hooks/dev/useSessionAutosave";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
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
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12">
                <DevEmptyState 
                  title="Command History" 
                  description="View past operations and executions"
                  icon={Activity}
                />
              </div>
            </div>
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
