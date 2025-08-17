import { CrossoverCard } from "./CrossoverCard";
import { TrendingUp, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StreakData {
  type: string;
  count: number;
  emoji: string;
}

interface ProgressStreaksCardProps {
  streaks?: StreakData[];
  className?: string;
}

export function ProgressStreaksCard({ 
  streaks,
  className 
}: ProgressStreaksCardProps) {
  const navigate = useNavigate();

  const defaultStreaks: StreakData[] = [
    { type: "Hydration", count: 5, emoji: "💧" },
    { type: "Exercise", count: 3, emoji: "🏃" },
    { type: "Sleep", count: 7, emoji: "😴" }
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
        <span className="text-sm text-muted-foreground">day streak</span>
      </div>
      
      <div className="text-sm">
        <span className="font-medium">{topStreak.type}</span>
        <span className="ml-1">{topStreak.emoji}</span>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {streakList.length > 1 ? `+${streakList.length - 1} other streaks` : "Keep it up!"}
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={TrendingUp}
      category="vitana"
      title="Progress Tracking"
      subtitle="Monitor your wellness streaks and achievement momentum"
      content={content}
      buttonText="See Progress"
      onButtonClick={() => navigate('/health-tracker/progress-goals')}
      className={className}
    />
  );
}