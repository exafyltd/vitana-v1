import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target } from "lucide-react";

interface ProfileAchievementsStripProps {
  achievements: string[];
  engagementBadges: string[];
}

export function ProfileAchievementsStrip({ achievements, engagementBadges }: ProfileAchievementsStripProps) {
  return (
    <div className="px-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gradient-to-r from-yellow-50/50 via-orange-50/50 to-red-50/50 border-yellow-200/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-6 text-center flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Achievements & Streaks
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {achievements.map((badge, index) => (
                <div key={index} className="group cursor-pointer">
                  <Badge className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-700 border-yellow-300/50 px-4 py-2 hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-200 hover:scale-105">
                    <Trophy className="h-3 w-3 mr-1.5" />
                    {badge}
                  </Badge>
                </div>
              ))}
              {engagementBadges.map((badge, index) => (
                <div key={index} className="group cursor-pointer">
                  <Badge className="bg-gradient-to-r from-green-400/20 to-blue-500/20 text-green-700 border-green-300/50 px-4 py-2 hover:from-green-400/30 hover:to-blue-500/30 transition-all duration-200 hover:scale-105">
                    <Target className="h-3 w-3 mr-1.5" />
                    {badge}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}