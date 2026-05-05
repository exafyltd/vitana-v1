import { Badge } from "@/components/ui/badge";
import { Award, Star, Trophy, Zap, Heart, Target, Crown, Flame } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { t } from '@/lib/i18n-toast';

interface Achievement {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  unlocked: boolean;
}

const achievements: Achievement[] = [
  { id: "1", icon: <Trophy className="w-4 h-4" />, label: "First Post", color: "hsl(var(--pill-sleep-accent))", unlocked: true },
  { id: "2", icon: <Heart className="w-4 h-4" />, label: "10 Followers", color: "hsl(var(--domain-community-accent))", unlocked: true },
  { id: "3", icon: <Flame className="w-4 h-4" />, label: "7-Day Streak", color: "hsl(var(--sys-autopilot-accent))", unlocked: true },
  { id: "4", icon: <Star className="w-4 h-4" />, label: "500 Index", color: "hsl(var(--sys-vitana-accent))", unlocked: true },
  { id: "5", icon: <Zap className="w-4 h-4" />, label: "Community Helper", color: "hsl(var(--pill-hydration-accent))", unlocked: true },
  { id: "6", icon: <Target className="w-4 h-4" />, label: "Goal Achiever", color: "hsl(var(--pill-nutrition-accent))", unlocked: false },
  { id: "7", icon: <Crown className="w-4 h-4" />, label: "VIP Member", color: "hsl(var(--pill-mental-accent))", unlocked: false },
  { id: "8", icon: <Award className="w-4 h-4" />, label: "Top Contributor", color: "hsl(var(--pill-exercise-accent))", unlocked: false },
];

export function AchievementsBanner() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-white/60 via-white/40 to-white/60 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-900/60 backdrop-blur-xl border border-white/30 dark:border-gray-800/30 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(var(--pill-sleep-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 flex items-center justify-center">
          <Award className="w-4 h-4 text-[hsl(var(--pill-sleep-accent))]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('screens.profile.achievements')}</h3>
          <p className="text-xs text-muted-foreground">
            {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
          </p>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative flex-shrink-0 group ${
                achievement.unlocked ? 'cursor-pointer' : 'opacity-40'
              }`}
            >
              {/* Glow effect for unlocked achievements */}
              {achievement.unlocked && (
                <div 
                  className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: achievement.color + '30' }}
                />
              )}
              
              <div className={`relative w-20 h-24 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-2 transition-all ${
                achievement.unlocked
                  ? 'bg-white dark:bg-gray-800 border-gray-200/50 dark:border-gray-700/50 group-hover:shadow-lg group-hover:-translate-y-1'
                  : 'bg-gray-100 dark:bg-gray-900 border-gray-200/30 dark:border-gray-800/30'
              }`}>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    achievement.unlocked ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: achievement.unlocked ? achievement.color + '20' : 'hsl(var(--muted))',
                    color: achievement.unlocked ? achievement.color : 'hsl(var(--muted-foreground))'
                  }}
                >
                  {achievement.icon}
                </div>
                <span className="text-[10px] font-medium text-center px-1 leading-tight">
                  {achievement.label}
                </span>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
