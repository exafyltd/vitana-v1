import React from "react";
import { cn } from "@/lib/utils";

interface ActionButtonBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized action button bar component for consistent positioning
 * across community pages. Positions buttons on the left edge, aligned
 * with the header and navigation elements.
 */
export function ActionButtonBar({ children, className }: ActionButtonBarProps) {
  return (
    <div className={cn(
      "px-6 py-4 bg-gradient-to-br from-domain-community-tint via-background to-domain-community-tint/50",
      className
    )}>
      <div className="flex gap-2">
        {children}
      </div>
    </div>
  );
}