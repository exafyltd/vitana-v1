/**
 * Task Card Component
 */

import { Task, TaskStatus } from "@/types/task";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, User } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  active: {
    bg: "bg-sys-vitana-tint dark:bg-sys-vitana-tint",
    text: "text-sys-vitana-accent dark:text-sys-vitana-accent",
    border: "border-sys-vitana-accent/30",
  },
  in_progress: {
    bg: "bg-sys-autopilot-tint dark:bg-sys-autopilot-tint",
    text: "text-sys-autopilot-accent dark:text-sys-autopilot-accent",
    border: "border-sys-autopilot-accent/30",
  },
  pending: {
    bg: "bg-muted dark:bg-muted",
    text: "text-muted-foreground dark:text-muted-foreground",
    border: "border-border",
  },
  scheduled: {
    bg: "bg-pill-hydration-tint dark:bg-pill-hydration-tint",
    text: "text-pill-hydration-accent dark:text-pill-hydration-accent",
    border: "border-pill-hydration-accent/30",
  },
  blocked: {
    bg: "bg-destructive/10 dark:bg-destructive/10",
    text: "text-destructive dark:text-destructive",
    border: "border-destructive/30",
  },
  cancelled: {
    bg: "bg-muted/50 dark:bg-muted/50",
    text: "text-muted-foreground/60 dark:text-muted-foreground/60",
    border: "border-border/50",
  },
};

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-sys-autopilot-tint text-sys-autopilot-accent border-sys-autopilot-accent/30",
  low: "bg-muted text-muted-foreground border-border",
};

function getCreatorLabel(task: Task): string {
  if (task.created_by_name) return task.created_by_name;
  if (task.created_by_email) {
    // Extract name from email: "dstevanovic@example.com" → "dstevanovic"
    return task.created_by_email.split("@")[0];
  }
  if (task.created_by) return task.created_by;
  return "";
}

function getInitiatorLabel(initiator?: string): string | null {
  if (!initiator) return null;
  switch (initiator) {
    case "manual": return "Manual";
    case "autopilot": return "Autopilot";
    case "operator": return "Operator";
    case "orb": return "Orb";
    case "system": return "System";
    default: return initiator;
  }
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const statusColor = statusColors[task.status];
  const creatorLabel = getCreatorLabel(task);
  
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg",
        "border-l-4",
        statusColor.border,
        task.isNew && "ring-2 ring-sys-vitana-accent animate-pulse-glow"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {task.id}
            </Badge>
            {task.confidence && (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <Sparkles className="h-3 w-3" />
                {task.confidence}%
              </Badge>
            )}
          </div>
          <Badge className={cn("text-xs shrink-0", priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 mt-2">{task.title}</h3>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
          <span className="font-medium">{task.owner}</span>
          <span>•</span>
          <Badge variant="outline" className="text-xs">
            {task.layer}
          </Badge>
          {task.module && (
            <>
              <span>•</span>
              <span>{task.module}</span>
            </>
          )}
          {creatorLabel && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="font-medium">{creatorLabel}</span>
              </span>
            </>
          )}
          {task.initiated_via && (
            <Badge variant="secondary" className="text-xs">
              {getInitiatorLabel(task.initiated_via)}
            </Badge>
          )}
        </div>
        
        {task.outcome && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.outcome}
          </p>
        )}
        
        {task.reason && (
          <p className="text-xs italic text-muted-foreground line-clamp-2 mb-3">
            💡 {task.reason}
          </p>
        )}
        
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              statusColor.bg.replace(/\/\d+/, "")
            )}
            style={{
              width: task.status === "cancelled" ? "100%" :
                     task.status === "active" || task.status === "in_progress" ? "60%" :
                     task.status === "scheduled" ? "20%" : "0%"
            }}
          />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex items-center justify-between">
        <Badge className={cn("text-xs", statusColor.bg, statusColor.text, statusColor.border)}>
          {task.status.replace("_", " ")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
        </span>
      </CardFooter>
    </Card>
  );
}
