import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, X } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

interface AutopilotNudgeProps {
  message: string;
  onPostNow?: () => void;
  onSchedule?: () => void;
  onDismiss?: () => void;
}

export function AutopilotNudge({
  message,
  onPostNow,
  onSchedule,
  onDismiss,
}: AutopilotNudgeProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Badge variant="secondary" className="mb-2">
                  {t('screens.sharing.autopilotSuggestion')}
                </Badge>
                <p className="text-sm font-medium">{message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onPostNow}>
                {t('screens.sharing.postNow')}
              </Button>
              <Button variant="outline" size="sm" onClick={onSchedule}>
                <Calendar className="w-4 h-4 mr-2" />
                {t('screens.sharing.schedule')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
