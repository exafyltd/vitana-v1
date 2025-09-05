import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionButton {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

interface RightActionsContainerProps {
  primaryActions?: ActionButton[];
  secondaryActions?: ActionButton[];
  className?: string;
  compact?: boolean;
}

export function RightActionsContainer({
  primaryActions = [],
  secondaryActions = [],
  className,
  compact = false
}: RightActionsContainerProps) {
  const allActions = [...primaryActions, ...secondaryActions];
  
  if (allActions.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "justify-end" : "justify-end lg:justify-start",
      className
    )}>
      {/* Primary Actions */}
      {primaryActions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || "default"}
          size={action.size || (compact ? "sm" : "default")}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={cn(
            "font-medium",
            action.loading && "animate-pulse"
          )}
        >
          {action.icon && (
            <span className="mr-2">{action.icon}</span>
          )}
          {action.label}
        </Button>
      ))}

      {/* Secondary Actions */}
      {secondaryActions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || "outline"}
          size={action.size || (compact ? "sm" : "default")}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className={cn(
            "font-medium",
            action.loading && "animate-pulse"
          )}
        >
          {action.icon && (
            <span className="mr-2">{action.icon}</span>
          )}
          {action.label}
        </Button>
      ))}
    </div>
  );
}