import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DevEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  showPhaseNote?: boolean;
}

export function DevEmptyState({ 
  title, 
  description, 
  icon: Icon,
  showPhaseNote = true 
}: DevEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {Icon && <Icon className="h-12 w-12 mb-4 text-muted-foreground" />}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
        {showPhaseNote && (
          <p className="text-xs text-muted-foreground">
            This feature will be available in Phase 2 when write operations are enabled.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
