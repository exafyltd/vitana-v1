/**
 * TasksView - Vitana Real-Time Task Board (Three-Column Cockpit)
 */

import { useEffect } from "react";
import { useTaskStream } from "@/hooks/useTaskStream";
import { useTaskStore } from "@/state/taskStore";
import { TaskAnalytics } from "@/components/dev/TaskAnalytics";
import { TaskConnectionStatus } from "@/components/dev/TaskConnectionStatus";
import { SchedulePane } from "@/components/dev/SchedulePane";
import { CatalogPane } from "@/components/dev/CatalogPane";
import { CompletedPane } from "@/components/dev/CompletedPane";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { t } from '@/lib/i18n-toast';

export function TasksView() {
  // Initialize real-time streaming
  useTaskStream();
  
  const tasks = useTaskStore((state) => state.tasks);

  return (
    <div className="flex flex-col h-full">
      {/* Header with connection status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t('screens.dev.taskBoard')}</h1>
          <p className="text-sm text-muted-foreground">{t('screens.dev.realtimeCommandCockpit')}</p>
        </div>
        <TaskConnectionStatus />
      </div>

      {/* Analytics ribbon */}
      <TaskAnalytics />

      {/* Three-column resizable layout */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={33} minSize={25}>
            <div className="h-full p-4">
              <SchedulePane tasks={tasks} />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={34} minSize={25}>
            <div className="h-full p-4 border-x">
              <CatalogPane tasks={tasks} />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={33} minSize={25}>
            <div className="h-full p-4">
              <CompletedPane tasks={tasks} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
