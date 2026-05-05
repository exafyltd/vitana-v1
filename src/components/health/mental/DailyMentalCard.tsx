import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyMentalData } from "@/types/mental";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface DailyMentalCardProps {
  data: DailyMentalData;
  onClick: () => void;
}

export function DailyMentalCard({ data, onClick }: DailyMentalCardProps) {
  const getMoodColor = () => {
    if (data.moodEmoji === "😊" || data.moodEmoji === "😌" || data.moodEmoji === "🙂") {
      return "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800";
    }
    if (data.moodEmoji === "😐") {
      return "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800";
    }
    return "from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 border-rose-200 dark:border-rose-800";
  };

  const focusPercentage = data.focusScore;
  const stressPercentage = data.stressLevel;

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-rose-100/20 dark:hover:shadow-rose-900/20 hover:ring-1 hover:ring-rose-300/50 dark:hover:ring-rose-700/40 hover:-translate-y-1 bg-gradient-to-br",
        getMoodColor()
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-rose-700 dark:text-rose-300">
            Day {data.dayId.split('-')[1]} ({data.dayName})
          </h4>
          <span className="text-2xl animate-pulse" style={{ animationDuration: '3s' }}>
            {data.moodEmoji}
          </span>
        </div>

        {/* Mood */}
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Mood: <span className="font-semibold">{data.mood}</span>
          </p>
        </div>

        {/* Focus Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">{t('screens.health.focusScore')}</span>
            <span className="font-semibold">{data.focusScore} / 100</span>
          </div>
          <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-300 via-orange-300 to-teal-300 transition-all ease-in-out duration-1000"
              style={{ width: `${focusPercentage}%` }}
            />
          </div>
        </div>

        {/* Stress Level */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">{t('screens.health.stressLevel')}</span>
            <span className="font-semibold">{data.stressLevel} / 100</span>
          </div>
          <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-400 to-orange-400 transition-all ease-in-out duration-1000"
              style={{ width: `${stressPercentage}%` }}
            />
          </div>
        </div>

        {/* Mindfulness */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            🧘 Mindfulness: <span className="font-semibold">{data.mindfulnessDuration}</span>
          </p>
        </div>

        {/* Tags */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag, idx) => (
              <Badge 
                key={idx}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Note */}
        <div className="pt-2">
          <p className="text-xs italic text-slate-500 dark:text-slate-400">
            💡 {data.aiNote}
          </p>
        </div>
      </div>
    </Card>
  );
}
