import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MentalCoachWidgetProps {
  message: string;
}

export function MentalCoachWidget({ message }: MentalCoachWidgetProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-[#FDE2E4]/70 via-[#FAD4C0]/70 to-[#CDEDF6]/70 dark:from-[#1A1013]/80 dark:via-[#1E1C1B]/80 dark:to-[#122025]/80 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 via-orange-400 to-teal-400 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🧘‍♀️</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('screens.health.mindCoachSays')}</p>
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm italic text-slate-700 dark:text-slate-300">
              {message}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
