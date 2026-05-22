import { CrossoverCard } from "./CrossoverCard";
import { TrendingUp, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface StreakData {
  type: string;
  count: number;
  emoji: string;
}

interface ProgressStreaksCardProps {
  streaks?: StreakData[];
  className?: string;
}

function ProgressStreaksCardBase({ 
  streaks,
  className 
}: ProgressStreaksCardProps) {
  const navigate = useNavigate();

  const defaultStreaks: StreakData[] = [
    { type: t('screens.health.pillar_hydration_title'), count: 5, emoji: "💧" },
    { type: t('screens.health.pillar_exercise_title'), count: 3, emoji: "🏃" },
    { type: t('screens.health.pillar_sleep_title'), count: 7, emoji: "😴" }
  ];

  const streakList = streaks || defaultStreaks;
  const topStreak = streakList.reduce((max, streak) => 
    streak.count > max.count ? streak : max
  );

  const content = (
    <div className="space-y-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <span className="text-lg font-bold text-orange-600">{topStreak.count}</span>
        <span className="text-sm text-muted-foreground">{t('screens.crossover.dayStreak')}</span>
      </div>
      
      <div className="text-sm">
        <span className="font-medium">{topStreak.type}</span>
        <span className="ml-1">{topStreak.emoji}</span>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {streakList.length > 1
          ? t('screens.ai.otherStreaks', { n: String(streakList.length - 1) })
          : t('screens.ai.keepItUp')}
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={TrendingUp}
      category="vitana"
      title={t('screens.crossover.progressTracking')}
      subtitle={t('screens.ai.subtitle_progressTracking')}
      content={content}
      buttonText={t('screens.ai.actionLabel_seeProgress')}
      onButtonClick={() => navigate('/health/my-health-tracker')}
      className={className}
    />
  );
}

export const ProgressStreaksCard = withCardId(ProgressStreaksCardBase, "CT-CX-008", "C-007");