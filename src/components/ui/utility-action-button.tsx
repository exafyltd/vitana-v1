import React from "react";
import { cn } from "@/lib/utils";

interface UtilityActionButtonProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized utility action button container for consistent positioning
 * across community pages. Positions buttons on the left edge, aligned
 * with the header and navigation elements.
 */
export function UtilityActionButton({ children, className }: UtilityActionButtonProps) {
  return (
    <div className={cn(
      "px-0 py-3 mb-4",
      className
    )}>
      <div className="flex gap-2.5 items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </div>
  );
}