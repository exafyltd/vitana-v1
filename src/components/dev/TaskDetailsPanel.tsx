import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
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

interface TaskDetailsPanelProps {
  task: Task | null;
}

export function TaskDetailsPanel({ task }: TaskDetailsPanelProps) {
  if (!task) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">{t('screens.dev.selectTaskViewDetails')}</p>
        </div>
      </div>
    );
  }

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
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
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
              <CardTitle className="text-lg">{task.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('screens.dev.taskId')}</span>
              <span className="font-mono font-medium">{task.id}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('screens.dev.assignee')}</span>
              <span className="font-medium">{task.assignee}</span>
            </div>
            {task.vtid && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('screens.dev.vtid')}</span>
                <span className="font-mono font-medium">{task.vtid}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('screens.dev.created')}</span>
              <span className="font-medium">{formatTime(task.created_at)}</span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <h4 className="text-sm font-semibold mb-3">{t('screens.dev.actions')}</h4>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('screens.dev.viewRelatedWorkflow')}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('screens.dev.viewTaskLogs')}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('screens.dev.markAsComplete')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
