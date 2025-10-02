import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  CalendarClock, 
  AlertCircle, 
  Focus,
  X,
  Undo2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutopilotSuggestion {
  id: string;
  type: 'fit-into-day' | 'resolve-conflict' | 'focus-block';
  title: string;
  description: string;
  suggestedTime?: string;
  conflictWith?: string;
  accepted?: boolean;
}

interface AutopilotCalendarSuggestionsProps {
  suggestions: AutopilotSuggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onUndo: (id: string) => void;
}

const getSuggestionIcon = (type: AutopilotSuggestion['type']) => {
  switch (type) {
    case 'fit-into-day':
      return CalendarClock;
    case 'resolve-conflict':
      return AlertCircle;
    case 'focus-block':
      return Focus;
  }
};

const getSuggestionColor = (type: AutopilotSuggestion['type']) => {
  switch (type) {
    case 'fit-into-day':
      return 'bg-sys-autopilot-tint text-sys-autopilot-accent border-sys-autopilot-accent/20';
    case 'resolve-conflict':
      return 'bg-sys-noti-accent/10 text-sys-noti-accent border-sys-noti-accent/20';
    case 'focus-block':
      return 'bg-pill-mental-tint text-pill-mental-accent border-pill-mental-accent/20';
  }
};

export function AutopilotCalendarSuggestions({
  suggestions,
  onAccept,
  onDismiss,
  onUndo
}: AutopilotCalendarSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2 pb-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-sys-autopilot-accent" />
        <h4 className="text-xs font-semibold text-sys-autopilot-accent">Autopilot Suggestions</h4>
      </div>

      {suggestions.map((suggestion) => {
        const Icon = getSuggestionIcon(suggestion.type);
        
        return (
          <Card
            key={suggestion.id}
            className={cn(
              "p-3 border transition-all animate-fade-in",
              suggestion.accepted 
                ? "bg-sys-autopilot-tint/50 border-sys-autopilot-accent/30" 
                : "bg-background hover:bg-muted/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                getSuggestionColor(suggestion.type)
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-sm font-semibold">{suggestion.title}</h5>
                    {suggestion.accepted && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-sys-autopilot-tint text-sys-autopilot-accent border-sys-autopilot-accent/30">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        Applied
                      </Badge>
                    )}
                  </div>
                  {!suggestion.accepted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => onDismiss(suggestion.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  {suggestion.description}
                </p>

                {suggestion.suggestedTime && (
                  <p className="text-xs text-sys-autopilot-accent mb-2">
                    ⏰ {suggestion.suggestedTime}
                  </p>
                )}

                {suggestion.conflictWith && (
                  <p className="text-xs text-sys-noti-accent mb-2">
                    ⚠️ Conflicts with: {suggestion.conflictWith}
                  </p>
                )}

                {suggestion.accepted ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUndo(suggestion.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <Undo2 className="h-3 w-3" />
                    Undo
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onAccept(suggestion.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Accept
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
