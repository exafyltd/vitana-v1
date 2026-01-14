import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VitanaIndexChipProps {
  className?: string;
}

/**
 * Vitana Index chip for mobile action rail
 * Displays the user's longevity score in a compact gradient circle
 */
export function VitanaIndexChip({ className }: VitanaIndexChipProps) {
  const navigate = useNavigate();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => navigate('/health')}
      className={`h-9 w-9 rounded-full bg-muted/50 hover:bg-muted p-0 shrink-0 ${className || ''}`}
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400/20 to-blue-500/20 flex items-center justify-center">
        <span className="text-[10px] font-bold text-primary">742</span>
      </div>
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
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className={`h-9 w-9 rounded-full bg-muted/50 hover:bg-muted p-0 relative shrink-0 ${className || ''}`}
    >
      <Plane className="h-4 w-4 text-muted-foreground" />
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
