import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RewardDot } from "@/components/ui/reward-dot";
import { Lightbulb, ArrowRight, Sparkles, Target } from "lucide-react";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface Suggestion {
  title: string;
  description: string;
  type: "action" | "insight" | "recommendation" | "alert";
  priority: "high" | "medium" | "low";
  action?: string;
  onAction?: () => void;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  title?: string;
  variant?: "card" | "list" | "minimal";
  maxItems?: number;
}

function SmartSuggestionsBase({ 
  suggestions, 
  title = "AI Insights & Suggestions",
  variant = "card",
  maxItems = 3
}: SmartSuggestionsProps) {
  const displaySuggestions = suggestions.slice(0, maxItems);

  const getTypeIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "action": return Target;
      case "insight": return Lightbulb;
      case "recommendation": return Sparkles;
      case "alert": return ArrowRight;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (type: Suggestion["type"]) => {
    switch (type) {
      case "action": return "text-calendar-primary";
      case "insight": return "text-calendar-accent";
      case "recommendation": return "text-calendar-secondary";
      case "alert": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getPriorityVariant = (priority: Suggestion["priority"]) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  if (variant === "minimal") {
    return (
      <div className="space-y-2">
        {displaySuggestions.map((suggestion, index) => {
          const IconComponent = getTypeIcon(suggestion.type);
          return (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <IconComponent className={`w-4 h-4 ${getTypeColor(suggestion.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{suggestion.title}</p>
              </div>
              {suggestion.action && (
                <Button size="sm" variant="ghost" onClick={suggestion.onAction}>
                  {suggestion.action}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-calendar-primary" />
          {title}
        </h3>
        <div className="space-y-2">
          {displaySuggestions.map((suggestion, index) => {
            const IconComponent = getTypeIcon(suggestion.type);
            return (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <IconComponent className={`w-5 h-5 mt-0.5 ${getTypeColor(suggestion.type)}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                    <Badge variant={getPriorityVariant(suggestion.priority)} className="text-xs">
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  {suggestion.action && (
                    <Button size="sm" variant="outline" onClick={suggestion.onAction} className="mt-2">
                      {suggestion.action}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-calendar-accent/5 to-calendar-primary/5 border-calendar-accent/20 relative">
      <RewardDot 
        points={displaySuggestions.length * 2} 
        description="Act on AI suggestions for health rewards"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-calendar-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displaySuggestions.map((suggestion, index) => {
          const IconComponent = getTypeIcon(suggestion.type);
          return (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
              <IconComponent className={`w-5 h-5 mt-0.5 ${getTypeColor(suggestion.type)}`} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                  <Badge variant={getPriorityVariant(suggestion.priority)} className="text-xs">
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                {suggestion.action && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={suggestion.onAction}
                    className="mt-1 p-0 h-auto text-calendar-primary hover:text-calendar-primary/80 hover:bg-transparent"
                  >
                    {suggestion.action} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        
        {displaySuggestions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('screens.health.allCaughtUpCheckBackLater')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SmartSuggestions = withCardId(SmartSuggestionsBase, "CT-HS-001", "C-004");
export default SmartSuggestions;