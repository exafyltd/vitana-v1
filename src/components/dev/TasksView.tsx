import { useState } from "react";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { TaskCatalogueList } from "@/components/dev/TaskCatalogueList";
import { MyTasksList } from "@/components/dev/MyTasksList";
import { CompletedTasksTable } from "@/components/dev/CompletedTasksTable";

export function TasksView() {
  const [activeSubTab, setActiveSubTab] = useState("task-catalogue");

  return (
    <SplitBar value={activeSubTab} onValueChange={setActiveSubTab}>
      <SplitBarList className="w-full mb-6 bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
        <SplitBarTrigger value="task-catalogue">Task Catalogue</SplitBarTrigger>
        <SplitBarTrigger value="my-tasks">My Tasks</SplitBarTrigger>
        <SplitBarTrigger value="completed">Completed / Archived</SplitBarTrigger>
      </SplitBarList>

      <SplitBarContent value="task-catalogue">
        <TaskCatalogueList />
      </SplitBarContent>

      <SplitBarContent value="my-tasks">
        <MyTasksList />
      </SplitBarContent>

      <SplitBarContent value="completed">
        <CompletedTasksTable />
      </SplitBarContent>
    </SplitBar>
  );
}
