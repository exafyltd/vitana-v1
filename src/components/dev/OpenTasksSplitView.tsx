import { useState } from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { OpenTasksView } from "./OpenTasksView";
import { TaskDetailsPanel } from "./TaskDetailsPanel";
import { useSplitFocus } from "@/hooks/dev/useSplitFocus";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress";
  vtid?: string;
  created_at: string;
}

export function OpenTasksSplitView() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { focusedPane, setFocus } = useSplitFocus();

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setFocus('right');
  };

  const leftPanel = <OpenTasksView onTaskClick={handleTaskClick} />;
  const rightPanel = <TaskDetailsPanel task={selectedTask} />;

  return (
    <div className="h-[600px]">
      <SplitScreen
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        defaultLeftSize={30}
        minLeftSize={20}
        minRightSize={50}
        screenId="command-hub-open-tasks"
      />
    </div>
  );
}
