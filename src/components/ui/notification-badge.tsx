import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  collapsed?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Format notification count according to requirements:
 * 0 → hide
 * 1-9 → raw number
 * 10-99 → raw number  
 * 100-999 → "99+"
 * 1000+ → "999+"
 */
export function formatNotificationCount(count: number): string {
  if (count === 0) return "";
  if (count < 10) return count.toString();
  if (count < 100) return count.toString();
  if (count < 1000) return "99+";
  return "999+";
}

export function NotificationBadge({ 
  count, 
  collapsed = false,
  className,
  ariaLabel 
}: NotificationBadgeProps) {
  if (count === 0) return null;
  
  const formattedCount = formatNotificationCount(count);
  
  return (
    <Badge 
      variant="default" 
      className={cn(
        "absolute -top-1 -right-1 p-0 flex items-center justify-center rounded-full",
        "bg-blue-500 text-white font-bold leading-none",
        "pointer-events-none whitespace-nowrap",
        // Consistent sizing for all sidebar badges
        collapsed 
          ? "h-4 w-4 text-[9px] min-w-[16px] px-0.5" 
          : "h-5 w-5 text-[10px] min-w-[20px] px-1",
        className
      )}
      aria-label={ariaLabel || `${count} notification${count !== 1 ? 's' : ''}`}
      role="status"
    >
      {formattedCount}
    </Badge>
  );
}
