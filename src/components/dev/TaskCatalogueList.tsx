import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, XCircle, ExternalLink, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface Task {
  id: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "review_needed";
  title: string;
  description: string;
  fullDescription?: string;
  assignee: string;
  vtid: string;
  dueDate: string;
  logs?: string[];
  relatedLinks?: Array<{ label: string; url: string }>;
}

const mockTasks: Task[] = [
  {
    id: "1",
    priority: "high",
    status: "in_progress",
    title: "Resolve Gateway Memory Leak",
    description: "Critical memory consumption increase detected in gateway service DEV-GWAY-0112",
    fullDescription: "Gateway service showing progressive memory increase over 48h period. Initial analysis points to connection pooling issue in Redis adapter. Requires immediate investigation and patch deployment.",
    assignee: "Agent Delta",
    vtid: "DEV-GWAY-0112",
    dueDate: "2h ago",
    logs: ["Memory usage: 85% → 92%", "Connection pool size: 500 → 2000", "Redis adapter v2.1.3 identified"],
    relatedLinks: [
      { label: "Gateway Metrics", url: "/dev/observability/metrics" },
      { label: "Autopilot Run #428", url: "/dev/command/autopilot-runs" }
    ]
  },
  {
    id: "2",
    priority: "high",
    status: "review_needed",
    title: "Database Migration Approval Required",
    description: "Schema changes for user authentication tables pending review before deployment",
    fullDescription: "Proposed migration adds 2FA support columns and indexes. Impact analysis complete. Estimated downtime: 3 minutes. Requires approval before execution.",
    assignee: "Agent Alpha",
    vtid: "DEV-CICDL-0089",
    dueDate: "4h ago",
    logs: ["Migration file generated", "Impact analysis: low risk", "Rollback strategy verified"],
    relatedLinks: [
      { label: "Migration Preview", url: "#" },
      { label: "VTID Details", url: "#" }
    ]
  },
  {
    id: "3",
    priority: "medium",
    status: "pending",
    title: "Update CI/CD Pipeline Configuration",
    description: "Adjust build timeouts and add caching layer for faster deployment cycles",
    assignee: "Agent Gamma",
    vtid: "DEV-CICDL-0091",
    dueDate: "1d ago"
  },
  {
    id: "4",
    priority: "low",
    status: "pending",
    title: "Documentation Update: API Endpoints",
    description: "Sync OpenAPI spec with latest gateway changes from v2.4.1 release",
    assignee: "Agent Beta",
    vtid: "DEV-DOCS-0034",
    dueDate: "2d ago"
  },
  {
    id: "5",
    priority: "medium",
    status: "in_progress",
    title: "Investigate Authentication Timeout Spike",
    description: "15% increase in auth token validation timeouts across OASIS layer",
    assignee: "Agent Delta",
    vtid: "DEV-AUTH-0203",
    dueDate: "6h ago"
  }
];

const priorityConfig = {
  high: { label: "High", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  medium: { label: "Medium", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  low: { label: "Low", className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" }
};

const statusConfig = {
  pending: { label: "Pending", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  review_needed: { label: "Review Needed", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" }
};

export function TaskCatalogueList() {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const toggleTask = (taskId: string) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  const handleComplete = (taskId: string) => {
    console.log("Complete task:", taskId);
    // Fade out and remove - implement with state management
  };

  const handlePostpone = (taskId: string) => {
    console.log("Postpone task:", taskId);
    // Open date picker
  };

  const handleCancel = (taskId: string) => {
    console.log("Cancel task:", taskId);
    // Show confirmation dialog
  };

  const handleAddNote = (taskId: string) => {
    console.log("Add note to task:", taskId);
    // Show note input
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-4 pr-4">
        {mockTasks.map((task) => {
          const isExpanded = expandedTask === task.id;
          const priority = priorityConfig[task.priority];
          const status = statusConfig[task.status];

          return (
            <Card
              key={task.id}
              className={cn(
                "transition-all duration-300 cursor-pointer hover:shadow-md bg-white/60 dark:bg-card/60 backdrop-blur-sm border-border/50",
                isExpanded && "shadow-lg ring-2 ring-primary/20"
              )}
              onClick={() => toggleTask(task.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", priority.className)}>
                        {priority.label}
                      </span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base leading-tight">{task.title}</h3>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>{task.assignee}</span>
                  <span>•</span>
                  <span className="font-mono text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {task.vtid}
                  </span>
                  <span>•</span>
                  <span>{task.dueDate}</span>
                </div>

                {isExpanded && (
                  <div className="pt-4 space-y-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                    {task.fullDescription && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t('screens.dev.fullDescription')}</h4>
                        <p className="text-sm text-muted-foreground">{task.fullDescription}</p>
                      </div>
                    )}

                    {task.logs && task.logs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t('screens.dev.logs')}</h4>
                        <ul className="space-y-1">
                          {task.logs.map((log, idx) => (
                            <li key={idx} className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                              {log}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {task.relatedLinks && task.relatedLinks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t('screens.dev.relatedLinks')}</h4>
                        <div className="flex gap-2 flex-wrap">
                          {task.relatedLinks.map((link, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("Navigate to:", link.url);
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {link.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(task.id);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {t('screens.dev.complete')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostpone(task.id);
                        }}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {t('screens.dev.postpone')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(task.id);
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {t('screens.dev.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddNote(task.id);
                        }}
                      >
                        <StickyNote className="w-3.5 h-3.5 mr-1" />
                        {t('screens.dev.addNote')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
