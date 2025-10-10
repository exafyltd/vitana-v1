import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NextBestActionCardProps {
  weakestPillar?: {
    name: string;
    score: number;
    icon: string;
  };
}

export default function NextBestActionCard({ 
  weakestPillar = { name: "Exercise", score: 68, icon: "🏃" } 
}: NextBestActionCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full bg-gradient-to-br from-orange-50 to-yellow-50 border-l-4 border-orange-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Priority Action
          </CardTitle>
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Urgent
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weakest Pillar Highlight */}
        <div className="bg-white/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{weakestPillar.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground">Focus Area</div>
              <div className="text-lg font-bold text-foreground">{weakestPillar.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{weakestPillar.score}%</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            <Zap className="w-4 h-4 inline mr-1 text-orange-500" />
            Quick Wins
          </div>
          
          <div className="space-y-2">
            <div className="bg-white/60 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">30-Day Fitness Challenge</div>
              <div className="text-xs text-muted-foreground">
                Join 500+ members improving their exercise scores
              </div>
            </div>
            
            <div className="bg-white/60 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">Personal Training Session</div>
              <div className="text-xs text-muted-foreground">
                Get customized workout plan from certified trainers
              </div>
            </div>
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
          onClick={() => navigate('/health/services-hub')}
        >
          Take Action Now
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Small steps lead to big improvements! 💪
        </p>
      </CardContent>
    </Card>
  );
}
