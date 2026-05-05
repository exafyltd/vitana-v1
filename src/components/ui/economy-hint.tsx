import * as React from "react";
import { Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

export interface EconomyHintProps {
  message: string;
  learnMoreUrl?: string;
  onLearnMore?: () => void;
  variant?: "info" | "warning" | "success" | "neutral";
  className?: string;
  compact?: boolean;
}

export function EconomyHint({
  message,
  learnMoreUrl,
  onLearnMore,
  variant = "neutral",
  className,
  compact = false
}: EconomyHintProps) {
  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else if (learnMoreUrl) {
      window.open(learnMoreUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border text-sm",
      {
        "bg-blue-50/50 border-blue-200 text-blue-800": variant === "info",
        "bg-amber-50/50 border-amber-200 text-amber-800": variant === "warning", 
        "bg-green-50/50 border-green-200 text-green-800": variant === "success",
        "bg-muted/50 border-muted text-muted-foreground": variant === "neutral",
      },
      compact && "p-3 text-xs",
      className
    )}>
      <Info className={cn(
        "flex-shrink-0 mt-0.5",
        compact ? "h-3 w-3" : "h-4 w-4",
        {
          "text-blue-600": variant === "info",
          "text-amber-600": variant === "warning",
          "text-green-600": variant === "success", 
          "text-muted-foreground": variant === "neutral",
        }
      )} />
      
      <div className="flex-1 min-w-0">
        <p className="leading-relaxed">{message}</p>
        
        {(learnMoreUrl || onLearnMore) && (
          <Button
            variant="ghost"
            size={compact ? "sm" : "default"}
            className={cn(
              "h-auto p-0 mt-2 font-medium hover:no-underline",
              {
                "text-blue-700 hover:text-blue-800": variant === "info",
                "text-amber-700 hover:text-amber-800": variant === "warning",
                "text-green-700 hover:text-green-800": variant === "success",
                "text-foreground hover:text-foreground": variant === "neutral",
              }
            )}
            onClick={handleLearnMore}
          >{t('screens.ui.learnMore')}
            <ExternalLink className={cn(
              "ml-1",
              compact ? "h-3 w-3" : "h-4 w-4"
            )} />
          </Button>
        )}
      </div>
    </div>
  );
}