import { useState } from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { DevHubFeed } from "./DevHubFeed";
import { CommandChat } from "./CommandChat";
import { OpenTasksView } from "./OpenTasksView";
import { TaskDetailsPanel } from "./TaskDetailsPanel";
import { useSplitFocus } from "@/hooks/dev/useSplitFocus";
import { Card } from "@/components/ui/card";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress";
  vtid?: string;
  created_at: string;
}

export function LiveConsoleTab() {
  const [nestedTab, setNestedTab] = useState("command-center");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { focusedPane, setFocus, hasUnreadLeft, hasUnreadRight, markRead } = useSplitFocus();

  const handleTickerVTIDClick = () => {
    setFocus('right');
    markRead('left');
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setFocus('right');
  };

  const commandCenterLeftPanel = (
    <DevHubFeed
      onVTIDClick={handleTickerVTIDClick}
      isFocused={focusedPane === 'left'}
      hasUnread={hasUnreadLeft}
    />
  );

  const commandCenterRightPanel = (
    <CommandChat
      isFocused={focusedPane === 'right'}
      hasUnread={hasUnreadRight}
    />
  );

  const openTasksLeftPanel = (
    <OpenTasksView onTaskClick={handleTaskClick} />
  );

  const openTasksRightPanel = (
    <TaskDetailsPanel task={selectedTask} />
  );

  return (
    <Card className="overflow-hidden">
      {/* Split-Screen Navigation Bar */}
      <SplitBar value={nestedTab} onValueChange={setNestedTab}>
        <SplitBarList className="w-full bg-muted/30 p-1">
          <SplitBarTrigger value="command-center">Command Center</SplitBarTrigger>
          <SplitBarTrigger value="open-tasks">Open Tasks</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="command-center">
          <div className="h-[600px]">
            <SplitScreen
              leftPanel={commandCenterLeftPanel}
              rightPanel={commandCenterRightPanel}
              defaultLeftSize={30}
              minLeftSize={20}
              minRightSize={50}
              screenId="command-hub-command-center"
            />
          </div>
        </SplitBarContent>

        <SplitBarContent value="open-tasks">
          <div className="h-[600px]">
            <SplitScreen
              leftPanel={openTasksLeftPanel}
              rightPanel={openTasksRightPanel}
              defaultLeftSize={30}
              minLeftSize={20}
              minRightSize={50}
              screenId="command-hub-open-tasks"
            />
          </div>
        </SplitBarContent>
      </SplitBar>

      <div className="p-2 border-t bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">
          Keyboard shortcuts: <kbd className="px-1 py-0.5 bg-background border rounded text-xs">1</kbd> Focus Left • <kbd className="px-1 py-0.5 bg-background border rounded text-xs">2</kbd> Focus Right • <kbd className="px-1 py-0.5 bg-background border rounded text-xs">←</kbd> <kbd className="px-1 py-0.5 bg-background border rounded text-xs">→</kbd> Switch
        </p>
      </div>
    </Card>
  );
}
