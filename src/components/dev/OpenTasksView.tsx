import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress";
  vtid?: string;
  created_at: string;
}

const MOCK_TASKS: Task[] = [
  {
    id: "task-001",
    title: "Deploy CICDL Pipeline Update",
    assignee: "System Agent",
    priority: "high",
    status: "in-progress",
    vtid: "DEV-CICDL-0031",
    created_at: "2025-01-15T08:30:00Z",
  },
  {
    id: "task-002",
    title: "Review Gateway Configuration",
    assignee: "Admin",
    priority: "medium",
    status: "pending",
    vtid: "DEV-GATEWAY-0042",
    created_at: "2025-01-15T09:15:00Z",
  },
  {
    id: "task-003",
    title: "Optimize Database Queries",
    assignee: "System Agent",
    priority: "low",
    status: "pending",
    created_at: "2025-01-15T10:00:00Z",
  },
];

interface OpenTasksViewProps {
  onTaskClick: (task: Task) => void;
}

export function OpenTasksView({ onTaskClick }: OpenTasksViewProps) {
  const [tasks] = useState<Task[]>(MOCK_TASKS);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-progress":
        return <Clock className="w-3 h-3" />;
      case "pending":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>{t('screens.dev.noOpenTasks')}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onTaskClick(task)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={getPriorityColor(task.priority)}
                      >
                        {task.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        {getStatusIcon(task.status)}
                        {task.status.replace("-", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Assignee: {task.assignee}</span>
                      {task.vtid && <span>VTID: {task.vtid}</span>}
                      <span>{formatTime(task.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
