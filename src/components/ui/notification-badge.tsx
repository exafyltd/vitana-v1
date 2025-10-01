import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  collapsed?: boolean;
  className?: string;
  ariaLabel?: string;
  label?: string;
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
  ariaLabel,
  label 
}: NotificationBadgeProps) {
  if (count === 0) return null;
  
  const formattedCount = formatNotificationCount(count);
  
  return (
    <Badge 
      variant="default" 
      className={cn(
        "absolute flex items-center justify-center rounded-full whitespace-nowrap",
        "bg-blue-500 text-white font-bold leading-none",
        "pointer-events-none",
        "z-10",
        collapsed 
          ? "top-[2px] right-[2px] h-[18px] min-w-[18px] px-[3px] text-[11px]" 
          : "top-1 right-1 h-[18px] min-w-[18px] px-1 text-xs",
        className
      )}
      aria-label={ariaLabel || `${label ? `${label}: ` : ''}${count} notification${count !== 1 ? 's' : ''}`}
      role="status"
      title={label ? `${label} • ${count}` : undefined}
    >
      {formattedCount}
    </Badge>
  );
}
