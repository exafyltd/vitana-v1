import { ReactElement, cloneElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";
import { Lock } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ReadOnlyTooltipProps {
  children: ReactElement;
  message?: string;
  enabled?: boolean;
}

export function ReadOnlyTooltip({
  children,
  message = "Write operations disabled (Read-Only Mode)",
  enabled = DEV_HUB_CONFIG.readonly,
}: ReadOnlyTooltipProps) {
  // If not in read-only mode, just return the children
  if (!enabled) {
    return children;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cloneElement(children, {
            disabled: true,
            className: `${children.props.className || ""} cursor-not-allowed opacity-50`,
          })}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('screens.dev.phase1ReadonlyModeEnabled')}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
