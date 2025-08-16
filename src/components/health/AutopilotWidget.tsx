import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Zap, Brain, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AutopilotWidgetProps {
  title?: string;
  suggestions: string[];
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onAction?: (suggestion: string) => void;
  variant?: "card" | "inline" | "mini";
}

export default function AutopilotWidget({ 
  title = "Autopilot ⚡", 
  suggestions, 
  isEnabled = false, 
  onToggle,
  onAction,
  variant = "card"
}: AutopilotWidgetProps) {
  if (variant === "mini") {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-calendar-primary/10 to-calendar-secondary/10 border border-calendar-primary/20">
        <Zap className="w-4 h-4 text-calendar-primary" />
        <span className="text-sm font-medium text-foreground">Autopilot</span>
        <Switch checked={isEnabled} onCheckedChange={onToggle} />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-calendar-primary/5 to-calendar-secondary/5 border border-calendar-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {suggestions[0] || "AI optimization enabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "Active" : "Paused"}
          </Badge>
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
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
          {suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-calendar-primary" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onAction?.(suggestion)}
                className="text-calendar-primary hover:bg-calendar-primary/10"
              >
                Do Now
              </Button>
            </div>
          ))}
        </div>
        {suggestions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All optimized! 🎯</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}