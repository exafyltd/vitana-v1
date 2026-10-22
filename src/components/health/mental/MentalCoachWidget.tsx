import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MentalCoachWidgetProps {
  message: string;
}

export function MentalCoachWidget({ message }: MentalCoachWidgetProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-surface-page-from via-surface-page-via to-surface-page-to border border-border/60 backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-category-4/80 via-status-warning/80 to-category-1/80 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🧘‍♀️</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t('screens.health.mindCoachSays')}</p>
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-category-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm italic text-muted-foreground">
              {message}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
