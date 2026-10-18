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
      return "from-status-success/10 to-category-1/10 border-status-success/30";
    }
    if (data.moodEmoji === "😐") {
      return "from-status-warning/10 to-status-warning/10 border-status-warning/30";
    }
    return "from-status-error/10 to-status-warning/10 border-status-error/30";
  };

  const focusPercentage = data.focusScore;
  const stressPercentage = data.stressLevel;

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-category-4/5 dark:hover:shadow-category-4/20 hover:ring-1 hover:ring-category-4/20 hover:-translate-y-1 bg-gradient-to-br",
        getMoodColor()
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-category-4">{t('screens.health.dayValue0Dayname', { value0: data.dayId.split('-')[1], dayName: data.dayName })}
          </h4>
          <span className="text-2xl animate-pulse" style={{ animationDuration: '3s' }}>
            {data.moodEmoji}
          </span>
        </div>

        {/* Mood */}
        <div>
          <p className="text-sm text-muted-foreground">{t('screens.health.mood')} <span className="font-semibold">{data.mood}</span>
          </p>
        </div>

        {/* Focus Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('screens.health.focusScore')}</span>
            <span className="font-semibold">{data.focusScore} / 100</span>
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-category-4/40 via-status-warning/40 to-category-1/40 transition-all ease-in-out duration-1000"
              style={{ width: `${focusPercentage}%` }}
            />
          </div>
        </div>

        {/* Stress Level */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('screens.health.stressLevel')}</span>
            <span className="font-semibold">{data.stressLevel} / 100</span>
          </div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-category-4/80 to-status-warning/80 transition-all ease-in-out duration-1000"
              style={{ width: `${stressPercentage}%` }}
            />
          </div>
        </div>

        {/* Mindfulness */}
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            {t('screens.health.mindfulness')} <span className="font-semibold">{data.mindfulnessDuration}</span>
          </p>
        </div>

        {/* Tags */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((tag, idx) => (
              <Badge 
                key={idx}
                variant="secondary"
                className="text-xs px-2 py-0.5 bg-card/60 backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Note */}
        <div className="pt-2">
          <p className="text-xs italic text-muted-foreground">
            💡 {data.aiNote}
          </p>
        </div>
      </div>
    </Card>
  );
}
