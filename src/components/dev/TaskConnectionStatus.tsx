/**
 * Task Connection Status Indicator
 */

import { useTaskStore } from "@/state/taskStore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TaskConnectionStatus() {
  const connectionState = useTaskStore((state) => state.connectionState);
  
  const statusConfig = {
    LIVE: {
      color: "bg-pill-nutrition-accent",
      text: "LIVE",
      pulse: true,
    },
    RECONNECTING: {
      color: "bg-sys-autopilot-accent",
      text: "RECONNECTING",
      pulse: true,
    },
    OFFLINE: {
      color: "bg-muted",
      text: "OFFLINE",
      pulse: false,
    },
  };
  
  const config = statusConfig[connectionState];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-xs gap-2",
        config.pulse && "animate-pulse"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", config.color)} />
      {config.text}
    </Badge>
  );
}
