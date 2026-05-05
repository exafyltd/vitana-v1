import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

export function MatchInfoTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            {t('screens.common.whyTheseMatchesBasedSleepActivity')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
