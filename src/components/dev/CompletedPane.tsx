/**
 * Completed Pane - Verified Finished Tasks
 */

import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CompletedPaneProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function CompletedPane({ tasks, onTaskClick }: CompletedPaneProps) {
  const completedTasks = tasks.filter(
    (t) => t.status === "cancelled" || t.outcome !== undefined && t.outcome !== null
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <CheckCircle2 className="h-5 w-5 text-pill-nutrition-accent" />
        <h2 className="text-lg font-semibold">{t('screens.dev.completed')}</h2>
        <span className="ml-auto text-sm text-muted-foreground">{t('screens.dev.lengthTasks', { length: completedTasks.length })}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pr-4 opacity-75">
          {completedTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('screens.dev.noCompletedTasksYet')}</p>
              <p className="text-sm mt-1">{t('screens.dev.completedTasksWillAppearHere')}</p>
            </div>
          ) : (
            completedTasks.map((task) => (
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
