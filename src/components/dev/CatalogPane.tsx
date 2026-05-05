/**
 * Catalog Pane - Unscheduled & AI-Suggested Tasks
 */

import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Library } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CatalogPaneProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function CatalogPane({ tasks, onTaskClick }: CatalogPaneProps) {
  const catalogTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "blocked"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <Library className="h-5 w-5 text-sys-ai-accent" />
        <h2 className="text-lg font-semibold">{t('screens.dev.catalog')}</h2>
        <span className="ml-auto text-sm text-muted-foreground">{t('screens.dev.lengthTasks', { length: catalogTasks.length })}
        </span>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pr-4">
          {catalogTasks.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('screens.dev.noPendingTasks')}</p>
              <p className="text-sm mt-1">{t('screens.dev.createTaskWaitForAiSuggestions')}</p>
            </div>
          ) : (
            catalogTasks.map((task) => (
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
