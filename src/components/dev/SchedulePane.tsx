/**
 * Schedule Pane - Active & Scheduled Tasks
 */

import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SchedulePaneProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function SchedulePane({ tasks, onTaskClick }: SchedulePaneProps) {
  const scheduledTasks = tasks.filter(
    (t) => t.status === "active" || t.status === "scheduled" || t.status === "in_progress"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <Calendar className="h-5 w-5 text-pill-hydration-accent" />
        <h2 className="text-lg font-semibold">Schedule</h2>
        <span className="ml-auto text-sm text-muted-foreground">
          {scheduledTasks.length} tasks
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
          {scheduledTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('screens.dev.noScheduledTasksYet')}</p>
              <p className="text-sm mt-1">{t('screens.dev.dragTasksFromCatalogScheduleThem')}</p>
            </div>
          ) : (
            scheduledTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
