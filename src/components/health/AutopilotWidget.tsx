import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RewardDot } from "@/components/ui/reward-dot";
import { Plane, Brain, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { withCardId } from "@/lib/withCardId";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

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
  title,
  sectionName,
  suggestions,
  isEnabled = false,
  onToggle,
  onAction,
  variant = "card"
}: AutopilotWidgetProps) {
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  const { translate } = useTranslation();
  
  // Filter suggestions based on user preferences
  const filteredSuggestions = preferences?.autopilot_enabled 
    ? suggestions 
    : [];

  const widgetTitle = title || translate('autopilot.widget.title');

  if (variant === "mini") {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-calendar-primary/10 to-calendar-secondary/10 border border-calendar-primary/20">
        <Plane className="w-4 h-4 text-calendar-primary" />
        <span className="text-sm font-medium text-foreground">{translate('autopilot.title')}</span>
        <Switch checked={preferences?.autopilot_enabled ?? isEnabled} onCheckedChange={onToggle} />
      </div>
    );
  }

  if (variant === "inline") {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20 hover:shadow-lg transition-all duration-300 relative">
      <RewardDot 
        points={suggestions.length > 0 ? 10 : 3} 
        description={suggestions.length > 0 ? translate('autopilot.widget.completeForRewards') : translate('autopilot.widget.enableForCredits')}
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{widgetTitle}</CardTitle>
              {sectionName && <p className="text-sm text-muted-foreground mt-1">{sectionName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={preferences?.autopilot_enabled ?? isEnabled ? "default" : "secondary"} className="text-xs">
              {preferences?.autopilot_enabled ?? isEnabled ? translate('autopilot.widget.active') : translate('autopilot.widget.paused')}
            </Badge>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => navigate('/settings/autopilot')}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Switch checked={preferences?.autopilot_enabled ?? isEnabled} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {filteredSuggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-calendar-primary" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAction?.(suggestion)} className="text-calendar-primary hover:bg-calendar-primary/10">
                {translate('autopilot.widget.doNow')}
              </Button>
            </div>
          ))}
        </div>
        {filteredSuggestions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{preferences?.autopilot_enabled ? translate('autopilot.widget.allOptimized') : translate('autopilot.widget.enableToSee')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const AutopilotWidget = withCardId(AutopilotWidgetBase, "CT-HS-004", "C-002");
export default AutopilotWidget;
