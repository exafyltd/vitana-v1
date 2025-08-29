import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";

interface VitanaIndexMiniProps {
  score?: number;
  trend?: "up" | "down" | "stable";
  variant?: "card" | "compact" | "badge";
  showDetails?: boolean;
  onClick?: () => void;
}

function VitanaIndexMiniBase({ 
  score = 75, 
  trend = "up", 
  variant = "card",
  showDetails = true,
  onClick
}: VitanaIndexMiniProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/health/my-health-tracker');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-calendar-success to-calendar-accent";
    if (score >= 60) return "from-calendar-accent to-calendar-secondary";
    return "from-calendar-secondary to-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  if (variant === "badge") {
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleClick}
      >
        <Badge variant="outline" className="bg-gradient-to-r from-calendar-primary/10 to-calendar-secondary/10">
          <Activity className="w-3 h-3 mr-1" />
          Vitana Index: {score}
        </Badge>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-calendar-success" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div 
        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-calendar-primary/5 to-calendar-secondary/5 border border-calendar-primary/10 cursor-pointer hover:shadow-md transition-all"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Vitana Index</p>
            <p className="text-sm text-muted-foreground">{getScoreLabel(score)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{score}</span>
          {trend === "up" && <TrendingUp className="w-5 h-5 text-calendar-success" />}
          {trend === "down" && <TrendingDown className="w-5 h-5 text-destructive" />}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">Vitana Index</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-foreground">{score}</span>
            {trend === "up" && <TrendingUp className="w-5 h-5 text-calendar-success" />}
            {trend === "down" && <TrendingDown className="w-5 h-5 text-destructive" />}
          </div>
        </div>
      </CardHeader>
      {showDetails && (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Health</span>
              <span className="font-medium text-foreground">{getScoreLabel(score)}</span>
            </div>
            <Progress 
              value={score} 
              className="h-2"
              // Progress component will use the default styling
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-foreground">82</div>
              <div className="text-muted-foreground">Physical</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{score}</div>
              <div className="text-muted-foreground">Mental</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">71</div>
              <div className="text-muted-foreground">Balance</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const VitanaIndexMini = withCardId(VitanaIndexMiniBase, "CT-HS-003");
export default VitanaIndexMini;