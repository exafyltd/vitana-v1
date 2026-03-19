import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "review-needed";
  vtid?: string;
  created_at: string;
  logs?: string[];
  relatedLinks?: { label: string; url: string }[];
  created_by?: string;
  created_by_name?: string;
  created_by_email?: string;
  initiated_via?: string;
}

const MOCK_TASKS: Task[] = [
  {
    id: "task-001",
    title: "Deploy CICDL Pipeline Update",
    description: "Critical pipeline configuration requires immediate deployment to production environment. Review logs and verify all health checks pass.",
    assignee: "System Agent",
    priority: "high",
    status: "in-progress",
    vtid: "DEV-CICDL-0031",
    created_at: "2025-01-15T08:30:00Z",
    logs: [
      "2025-01-15 08:30 - Pipeline initiated",
      "2025-01-15 08:32 - Build successful",
      "2025-01-15 08:35 - Awaiting deployment approval",
    ],
    relatedLinks: [
      { label: "View Pipeline", url: "/dev/workflows/pipeline-0031" },
      { label: "Autopilot Run", url: "/dev/autopilot/run-142" },
    ],
  },
  {
    id: "task-002",
    title: "Review Gateway Configuration",
    description: "Gateway settings need verification before next deployment cycle.",
    assignee: "Admin",
    priority: "medium",
    status: "pending",
    vtid: "DEV-GATEWAY-0042",
    created_at: "2025-01-15T09:15:00Z",
    logs: [
      "2025-01-15 09:15 - Configuration drift detected",
      "2025-01-15 09:20 - Review requested",
    ],
  },
  {
    id: "task-003",
    title: "Optimize Database Queries",
    description: "Performance analysis shows potential for query optimization in user service.",
    assignee: "System Agent",
    priority: "low",
    status: "pending",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "task-004",
    title: "Security Patch Required",
    description: "Critical security update detected for authentication module.",
    assignee: "Security Bot",
    priority: "high",
    status: "review-needed",
    vtid: "DEV-SEC-0089",
    created_at: "2025-01-15T07:45:00Z",
  },
  {
    id: "task-005",
    title: "Memory Leak Investigation",
    description: "Gateway pod showing gradual memory increase over 24h period.",
    assignee: "System Agent",
    priority: "medium",
    status: "in-progress",
    vtid: "DEV-PERF-0156",
    created_at: "2025-01-15T06:00:00Z",
    logs: [
      "2025-01-15 06:00 - Memory trend detected",
      "2025-01-15 06:30 - Profiling started",
      "2025-01-15 08:00 - Analysis in progress",
    ],
  },
];

export function OpenTasksList() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const { translate } = useTranslation();

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
      case "review-needed":
        return <CheckCircle2 className="w-3 h-3" />;
      default:
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace("-", " ").toUpperCase();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleComplete = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
    setExpandedTask(null);
  };

  const handleCancel = (taskId: string) => {
    if (confirm(translate('tasks.confirmCancelTask', 'Are you sure you want to cancel this task?'))) {
      setTasks(tasks.filter((t) => t.id !== taskId));
      setExpandedTask(null);
    }
  };

  const handlePostpone = (taskId: string) => {
    alert(translate('tasks.postponeComingSoon', 'Postpone feature coming soon'));
  };

  const handleAddNote = (taskId: string) => {
    const note = prompt(translate('tasks.addNotePrompt', 'Add a note to this task:'));
    if (note) {
      alert(translate('tasks.noteAdded', 'Note added: {note}').replace('{note}', note));
    }
  };

  const handleToggle = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-3">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>{translate('tasks.noOpenTasks', 'No open tasks')}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Collapsible
                key={task.id}
                open={expandedTask === task.id}
                onOpenChange={() => handleToggle(task.id)}
              >
                <Card
                  className={cn(
                    "transition-all duration-200 hover:shadow-md border-border/50",
                    expandedTask === task.id && "shadow-lg"
                  )}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 text-left">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium",
                                getPriorityColor(task.priority)
                              )}
                            >
                              {task.priority.toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="gap-1.5 text-xs"
                            >
                              {getStatusIcon(task.status)}
                              {getStatusLabel(task.status)}
                            </Badge>
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-base mb-2">
                            {task.title}
                          </h3>

                          {/* Description (if not expanded) */}
                          {!expandedTask && task.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">{translate('tasks.assignee', 'Assignee')}:</span>{" "}
                              {task.assignee}
                            </span>
                            {task.vtid && (
                              <span className="flex items-center gap-1 text-primary">
                                <span className="font-medium">VTID:</span>{" "}
                                {task.vtid}
                              </span>
                            )}
                            <span>{formatTime(task.created_at)}</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium">
                                {task.created_by_name ||
                                 (task.created_by_email ? task.created_by_email.split("@")[0] : null) ||
                                 task.created_by ||
                                 "Unknown"}
                              </span>
                              {task.initiated_via && (
                                <Badge variant="secondary" className="text-xs ml-1 capitalize">
                                  {task.initiated_via}
                                </Badge>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Expand icon */}
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                            expandedTask === task.id && "rotate-180"
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  {/* Expanded content */}
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-5 px-5 space-y-4 animate-accordion-down">
                      {/* Full description */}
                      {task.description && (
                        <div className="pt-2 border-t border-border/50">
                          <h4 className="text-sm font-semibold mb-2">
                            {translate('tasks.description', 'Description')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Logs */}
                      {task.logs && task.logs.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <h4 className="text-sm font-semibold mb-2">
                            {translate('tasks.activityLog', 'Activity Log')}
                          </h4>
                          <div className="space-y-1">
                            {task.logs.map((log, idx) => (
                              <p
                                key={idx}
                                className="text-xs text-muted-foreground font-mono"
                              >
                                {log}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related links */}
                      {task.relatedLinks && task.relatedLinks.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <h4 className="text-sm font-semibold mb-2">
                            {translate('tasks.relatedLinks', 'Related Links')}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {task.relatedLinks.map((link, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(translate('tasks.navigateTo', 'Navigate to: {url}').replace('{url}', link.url));
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                                {link.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(task.id);
                            }}
                          >
                            <Check className="w-3 h-3" />
                            {translate('tasks.complete', 'Complete')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostpone(task.id);
                            }}
                          >
                            <Calendar className="w-3 h-3" />
                            {translate('tasks.postpone', 'Postpone')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNote(task.id);
                            }}
                          >
                            <MessageSquare className="w-3 h-3" />
                            {translate('tasks.addNote', 'Add Note')}
                          </Button>
                          {task.vtid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(translate('tasks.openVtid', 'Open VTID: {vtid}').replace('{vtid}', task.vtid!));
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {translate('tasks.openContext', 'Open Context')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(task.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                            {translate('buttons.cancel', 'Cancel')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
