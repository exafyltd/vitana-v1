import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

export interface RewardDotProps {
  points?: number;
  description?: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
  showTooltip?: boolean;
}

export function RewardDot({
  points,
  description = "Earn rewards",
  position = "top-right",
  size = "md",
  animate = true,
  className,
  showTooltip = true
}: RewardDotProps) {
  const dotElement = (
    <div
      className={cn(
        "absolute rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg z-[9999]",
        {
          // Size variants
          "w-2 h-2": size === "sm",
          "w-3 h-3": size === "md", 
          "w-4 h-4": size === "lg",
          
          // Position variants - using positive positioning inside card boundaries
          "top-2 right-2": position === "top-right",
          "top-2 left-2": position === "top-left",
          "bottom-2 right-2": position === "bottom-right",
          "bottom-2 left-2": position === "bottom-left",
          
          // Animation
          "animate-pulse": animate,
        },
        className
      )}
    >
      {points && size !== "sm" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">
            {points > 99 ? "99+" : points}
          </span>
        </div>
      )}
      
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-full bg-purple-400 opacity-20 scale-150",
        animate && "animate-ping"
      )} />
    </div>
  );

  if (!showTooltip) {
    return dotElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dotElement}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            {points && (
              <div className="font-semibold text-purple-600">{t('screens.ui.pointsCredits', { points })}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {description}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}