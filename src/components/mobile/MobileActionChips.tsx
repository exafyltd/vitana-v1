import { Button } from "@/components/ui/button";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import { VITANA_INDEX_OPEN_EVENT } from "@/components/health/VitanaIndexSheet";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface VitanaIndexChipProps {
  className?: string;
}

/**
 * Vitana Index chip for mobile action rail. Opens the shared Index Sheet via
 * the global `vitana:open-index` event — same destination as the desktop
 * sidebar chip.
 */
export function VitanaIndexChip({ className }: VitanaIndexChipProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT))}
      className={`h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0 ${className || ''}`}
      aria-label="Open Vitana Index"
    >
      <span className="text-xs">🧬</span>
      <span className="text-sm font-medium text-primary"><VitanaIndexValue /></span>
    </Button>
  );
}

interface AutopilotChipProps {
  pendingCount: number;
  onClick: () => void;
  className?: string;
}

/**
 * Autopilot chip for mobile action rail
 * Shows pending actions count with animated badge
 */
export function AutopilotChip({ pendingCount, onClick, className }: AutopilotChipProps) {
  const { translate } = useTranslation();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className={`h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0 ${className || ''}`}
    >
      <Plane className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
      {pendingCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
        >
          {pendingCount}
        </Badge>
      )}
    </Button>
  );
}
