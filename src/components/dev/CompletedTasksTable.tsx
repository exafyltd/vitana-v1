import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, Copy } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CompletedTask {
  id: string;
  taskName: string;
  completedDate: string;
  result: "success" | "failed" | "canceled";
  assignee: string;
}

const completedTasks: CompletedTask[] = [
  {
    id: "c1",
    taskName: "Deploy Gateway Hotfix v2.4.2",
    completedDate: "2024-01-15 14:23",
    result: "success",
    assignee: "Agent Alpha"
  },
  {
    id: "c2",
    taskName: "Rotate API Keys for External Services",
    completedDate: "2024-01-15 11:45",
    result: "success",
    assignee: "Agent Gamma"
  },
  {
    id: "c3",
    taskName: "Investigate VTID DEV-OASIS-0087",
    completedDate: "2024-01-14 18:12",
    result: "success",
    assignee: "Agent Delta"
  },
  {
    id: "c4",
    taskName: "Update Kubernetes Cluster Configuration",
    completedDate: "2024-01-14 09:30",
    result: "failed",
    assignee: "Agent Beta"
  },
  {
    id: "c5",
    taskName: "Generate Monthly Performance Report",
    completedDate: "2024-01-13 16:55",
    result: "success",
    assignee: "Agent Gamma"
  },
  {
    id: "c6",
    taskName: "Test New Authentication Flow",
    completedDate: "2024-01-13 10:22",
    result: "canceled",
    assignee: "Agent Alpha"
  },
  {
    id: "c7",
    taskName: "Backup Production Database Snapshot",
    completedDate: "2024-01-12 22:15",
    result: "success",
    assignee: "Agent Delta"
  }
];

const resultConfig = {
  success: { label: "Success", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  canceled: { label: "Canceled", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" }
};

export function CompletedTasksTable() {
  const handleReopen = (taskId: string) => {
    console.log("Reopen task:", taskId);
  };

  const handleDuplicate = (taskId: string) => {
    console.log("Duplicate task:", taskId);
  };

  return (
    <Card className="bg-white/60 dark:bg-card/60 backdrop-blur-sm border-border/50">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="col-span-4">{t('screens.dev.taskName')}</div>
              <div className="col-span-2">{t('screens.dev.completedDate')}</div>
              <div className="col-span-2">{t('screens.dev.result')}</div>
              <div className="col-span-2">{t('screens.dev.assignee')}</div>
              <div className="col-span-2 text-right">{t('screens.dev.actions')}</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {completedTasks.map((task) => {
                const result = resultConfig[task.result];

                return (
                  <div
                    key={task.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center opacity-75"
                  >
                    <div className="col-span-4 text-sm font-medium">{task.taskName}</div>
                    <div className="col-span-2 text-sm text-muted-foreground font-mono">{task.completedDate}</div>
                    <div className="col-span-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${result.className}`}>
                        {result.label}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">{task.assignee}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleReopen(task.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        {t('screens.dev.reopen')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleDuplicate(task.id)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {t('screens.dev.duplicate')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
