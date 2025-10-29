import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
            variant="outline"
            onClick={onClick}
            className="h-9 w-9 p-0 bg-white/50 dark:bg-card/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-card/80 transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Restore previous session</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
