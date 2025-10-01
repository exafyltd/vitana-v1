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
        "absolute -top-2 -right-2 p-0 flex items-center justify-center rounded-full",
        "bg-blue-500 text-white font-bold leading-none",
        "pointer-events-none",
        "h-6 w-6 text-xs min-w-[24px]",
        className
      )}
      aria-label={ariaLabel || `${count} notification${count !== 1 ? 's' : ''}`}
      role="status"
    >
      {formattedCount}
    </Badge>
  );
}
