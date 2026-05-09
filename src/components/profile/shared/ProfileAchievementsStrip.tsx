import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, ChevronRight, Zap, Users, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface ProfileAchievementsStripProps {
  achievements: string[];
  engagementBadges: string[];
  nextMilestone?: {
    title: string;
    progress: number;
    target: string;
  };
}

export function ProfileAchievementsStrip({ 
  achievements, 
  engagementBadges, 
  nextMilestone = {
    title: "Community Leader",
    progress: 75,
    target: "Help 5 more people reach their goals"
  }
}: ProfileAchievementsStripProps) {
  return (
    <div className="px-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gradient-to-r from-yellow-50/50 via-orange-50/50 to-red-50/50 border-yellow-200/30 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                {t('screens.profile.achievementsProgress')}
              </h3>
              <Button variant="outline" size="sm" className="text-xs">
                {t('screens.profile.viewAll')} <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            {/* Achievement Badges */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {achievements.map((badge, index) => (
                <div key={index} className="group cursor-pointer">
                  <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-700 border-yellow-300/50 px-4 py-2 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-200 hover:scale-105 group-hover:shadow-md">
                    <Trophy className="h-3 w-3 mr-1.5" />
                    {badge}
                  </Badge>
                </div>
              ))}
              {engagementBadges.map((badge, index) => (
                <div key={index} className="group cursor-pointer">
                  <Badge className="bg-gradient-to-r from-green-400/20 to-blue-500/20 text-green-700 border-green-300/50 px-4 py-2 hover:from-green-400/30 hover:to-blue-500/30 transition-all duration-200 hover:scale-105 group-hover:shadow-md">
                    <Target className="h-3 w-3 mr-1.5" />
                    {badge}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Next Milestone Progress */}
            <div className="bg-white/80 rounded-xl p-4 border border-yellow-200/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="icon-community rounded-full p-2">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{t('screens.profile.nextMilestone')}</h4>
                    <p className="text-xs text-muted-foreground">{nextMilestone.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{nextMilestone.progress}%</div>
                  <div className="text-xs text-muted-foreground">{t('screens.profile.complete')}</div>
                </div>
              </div>
              <Progress value={nextMilestone.progress} className="mb-2 h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {nextMilestone.target}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}