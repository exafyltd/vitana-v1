import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RewardDot } from "@/components/ui/reward-dot";
import { Zap, Brain, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { withCardId } from "@/lib/withCardId";
interface AutopilotWidgetProps {
  title?: string;
  sectionName?: string;
  suggestions: string[];
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onAction?: (suggestion: string) => void;
  variant?: "card" | "inline" | "mini";
}
function AutopilotWidgetBase({
  title = "Autopilot ⚡",
  sectionName,
  suggestions,
  isEnabled = false,
  onToggle,
  onAction,
  variant = "card"
}: AutopilotWidgetProps) {
  if (variant === "mini") {
    return <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-calendar-primary/10 to-calendar-secondary/10 border border-calendar-primary/20">
        <Zap className="w-4 h-4 text-calendar-primary" />
        <span className="text-sm font-medium text-foreground">Autopilot</span>
        <Switch checked={isEnabled} onCheckedChange={onToggle} />
      </div>;
  }
  if (variant === "inline") {
    return;
  }
  return <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20 hover:shadow-lg transition-all duration-300 relative">
      <RewardDot 
        points={suggestions.length > 0 ? 10 : 3} 
        description={suggestions.length > 0 ? "Complete autopilot suggestions for rewards" : "Enable autopilot for credits"}
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Autopilot ⚡</CardTitle>
              {sectionName && <p className="text-sm text-muted-foreground mt-1">{sectionName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
              {isEnabled ? "Active" : "Paused"}
            </Badge>
            <Switch checked={isEnabled} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-calendar-primary" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAction?.(suggestion)} className="text-calendar-primary hover:bg-calendar-primary/10">
                Do Now
              </Button>
            </div>)}
        </div>
        {suggestions.length === 0 && <div className="text-center py-4 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All optimized! 🎯</p>
          </div>}
      </CardContent>
    </Card>;
}
const AutopilotWidget = withCardId(AutopilotWidgetBase, "CT-HS-004", "C-002");
export default AutopilotWidget;