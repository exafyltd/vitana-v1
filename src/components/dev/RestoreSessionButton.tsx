import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

interface RestoreSessionButtonProps {
  onClick: () => void;
}

export function RestoreSessionButton({ onClick }: RestoreSessionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClick}
            className="h-9 w-9 p-0 hover:opacity-70 transition-opacity"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('screens.dev.restorePreviousSession')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
