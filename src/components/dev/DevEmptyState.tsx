import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { t } from '@/lib/i18n-toast';

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
          <p className="text-xs text-muted-foreground">{t('screens.dev.thisFeatureWillAvailablePhase2')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
